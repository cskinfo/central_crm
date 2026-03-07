const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const Quotation = require("../models/Quotation");
const Settings = require("../models/Settings");

// Safely convert images
function getBase64Image(filePath) {
  if (fs.existsSync(filePath)) {
    let ext = path.extname(filePath).replace(".", "").toLowerCase();
    if (ext === "jpg") ext = "jpeg"; 
    if (ext === "svg") ext = "svg+xml";
    const base64Image = fs.readFileSync(filePath, "base64");
    return `data:image/${ext};base64,${base64Image}`;
  }
  return null;
}

router.get("/:id/pdf", async (req, res) => {
  try {
    const quotationId = req.params.id;
    const withGst = req.query.gst !== "false"; 
    const templateId = req.query.templateId;

    const quotation = await Quotation.findById(quotationId).populate("deal");
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    let settings = await Settings.findOne() || { templates: [] };
    let selectedTemplate = settings.templates?.length > 0 ? 
      (templateId ? settings.templates.find(t => t._id.toString() === templateId) || settings.templates[0] : settings.templates[0]) 
      : settings;

    // GENERATE UNIQUE QUOTATION NUMBER 
    const safeDate = quotation.createdAt ? new Date(quotation.createdAt) : new Date();
    const previousQuotesCount = await Quotation.countDocuments({ createdAt: { $lt: safeDate } });
    const sequenceNumber = 1000 + previousQuotesCount + 1; 

    const rawCompanyName = selectedTemplate?.companyName || process.env.COMPANY_NAME || "CSK";
    let prefix = rawCompanyName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    if (prefix.length < 3) prefix = (prefix + "XXX").substring(0, 3);
    
    const uniqueQuoteNumber = `${prefix}-${safeDate.getFullYear()}-${sequenceNumber}`;

    // PREPARE DATA
    const items = Array.isArray(quotation.items) && quotation.items.length > 0 ? quotation.items : quotation.products;
    let itemsBaseTotal = 0, itemsGstTotal = 0;
    const marginType = quotation.marginType || "percentage";
    const marginValue = Number(quotation.marginValue || 0);

    const itemsForPdf = items.map((it) => {
      const qty = Number(it.qty ?? it.quantity ?? 0);
      const vendorPrice = Number(it.unitPrice ?? it.price ?? 0);
      let clientPrice = vendorPrice;
      
      if (marginValue > 0) {
        clientPrice += marginType === "percentage" ? (vendorPrice * marginValue) / 100 : marginValue;
      }

      const baseAmount = qty * clientPrice;
      const gstRate = Number(it.gstRate ?? it.gst ?? 0);
      const gstAmount = withGst ? (baseAmount * gstRate) / 100 : 0;
      
      itemsBaseTotal += baseAmount; 
      itemsGstTotal += gstAmount;

      return { 
        ...it._doc, 
        qty, 
        unitPrice: clientPrice, 
        gstRate, 
        gstAmount, 
        total: baseAmount + gstAmount 
      };
    });

    const freightCharges = Number(quotation.freightCharges || 0);
    const freightGstAmount = withGst ? (freightCharges * Number(quotation.freightGstRate || 0)) / 100 : 0;
    const installationCharges = Number(quotation.installationCharges || 0);
    const installationGstAmount = withGst ? (installationCharges * Number(quotation.installationGstRate || 0)) / 100 : 0;

    let headerDataUri = null, footerDataUri = null;
    if (selectedTemplate?.headerImage) headerDataUri = getBase64Image(path.join(__dirname, "..", "uploads", "config", path.basename(selectedTemplate.headerImage)));
    if (!headerDataUri) headerDataUri = getBase64Image(path.join(__dirname, "..", "templates", "header.png"));
    
    if (selectedTemplate?.footerImage) footerDataUri = getBase64Image(path.join(__dirname, "..", "uploads", "config", path.basename(selectedTemplate.footerImage)));
    if (!footerDataUri) footerDataUri = getBase64Image(path.join(__dirname, "..", "templates", "footer.png"));

    const templatePath = path.join(__dirname, "..", "templates", "quotation.ejs");
    const html = await ejs.renderFile(templatePath, {
      quotation, 
      quoteNumber: uniqueQuoteNumber, 
      items: itemsForPdf, 
      withGst,
      itemsBaseTotal, 
      itemsGstTotal, 
      freightCharges, 
      freightGstRate: quotation.freightGstRate || 0, 
      freightGstAmount, 
      freightTotal: freightCharges + freightGstAmount,
      installationCharges, 
      installationGstAmount, 
      installationTotal: installationCharges + installationGstAmount,
      grandTotal: (itemsBaseTotal + itemsGstTotal) + (freightCharges + freightGstAmount) + (installationCharges + installationGstAmount),
      recipientName: quotation.deal?.clientName || "Valued Client", 
      requesterName: quotation.requestedBy?.firstName || "Sales Representative",
      approverName: quotation.approvedBy?.firstName || "", 
      subjectLine: quotation.subject || "Quotation",
      clientAddress: quotation.deal?.clientAddress || "",
      headerImage: headerDataUri || null,
      footerImage: footerDataUri || null,
      companyName: selectedTemplate?.companyName || "Company Pvt. Ltd."
    });

    // GENERATE PDF
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // CRITICAL FIX: displayHeaderFooter MUST be false to prevent double printing!
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false, // Ensures Puppeteer doesn't double-print
      margin: { top: 0, bottom: 0, left: 0, right: 0 } // Ensures your fixed CSS fits perfectly
    });

    await browser.close();

    // SECURE TRANSFER
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    
    res.json({
      success: true,
      filename: `Quotation_${uniqueQuoteNumber}.pdf`,
      pdfBase64: pdfBase64
    });

  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ message: "Failed to generate PDF", error: err.message });
  }
});

module.exports = router;