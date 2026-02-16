const express = require("express");
const router = express.Router();
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const Quotation = require("../models/Quotation");
const auth = require("../middleware/auth");
const Settings = require("../models/Settings");

// --- HELPER: Convert Local File to Base64 ---
const getBase64Image = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const bitmap = fs.readFileSync(filePath);
      const ext = path.extname(filePath).substring(1);
      return `data:image/${ext};base64,${bitmap.toString("base64")}`;
    }
  } catch (err) {
    console.warn("Image load error:", err.message);
  }
  return null;
};

// --- HELPER: Format Address ---
function formatAddress(addr) {
  if (!addr) return "";
  const parts = [];
  if (addr.street) parts.push(addr.street);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  const postal = addr.postalCode || addr.postal || "";
  if (postal) parts.push(postal);
  if (addr.country) parts.push(addr.country);
  return parts.filter(Boolean).join(", ");
}

// --- HELPER: Normalize Items ---
function normalizeItems(rawItems, quotationFallback = {}) {
  if (!rawItems) return [];
  if (typeof rawItems === "string") {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return rawItems
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => ({
          productName: line,
          description: line,
          qty: Number(quotationFallback.quantity || 1),
          unitPrice: Number(quotationFallback.targetPrice || 0),
          gstRate: 0,
        }));
    }
  }
  if (Array.isArray(rawItems)) {
    return rawItems.map((it) => ({
      productName: it.productName || it.product || it.name || "",
      description: it.description || "",
      brand: it.brand || "",
      model: it.model || "",
      qty: Number(it.qty ?? it.quantity ?? 1),
      unitPrice: Number(it.unitPrice ?? it.price ?? it.rate ?? 0),
      gstRate: Number(it.gstRate ?? it.gst ?? 0),
    }));
  }
  return [];
}

// --- HELPER: Build Items for PDF ---
function buildItemsForPdf(items, withGst, marginType, marginValue) {
  return items.map((it) => {
    const qty = Number(it.qty || 0);
    const vendorPrice = Number(it.unitPrice || 0);
    let clientUnitPrice = vendorPrice;
    const mValue = Number(marginValue || 0);

    if (mValue > 0) {
      if (marginType === "percentage") {
        clientUnitPrice = vendorPrice + (vendorPrice * mValue) / 100;
      } else {
        clientUnitPrice = vendorPrice + mValue;
      }
    }

    const baseAmount = qty * clientUnitPrice;
    const gstRate = Number(it.gstRate || 0);
    const gstAmount = withGst ? (baseAmount * gstRate) / 100 : 0;
    const total = baseAmount + gstAmount;

    return {
      productName: it.productName || "",
      description: it.description || "",
      brand: it.brand || "",
      model: it.model || "",
      qty,
      unitPrice: clientUnitPrice,
      gstRate,
      gstAmount,
      baseAmount,
      total,
    };
  });
}

// ==========================================
//      GENERATE PDF ROUTE
// ==========================================
router.get("/:id/pdf", auth, async (req, res) => {
  let browser = null;
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "Missing quotation id" });

    // 1. FETCH DATA
    const settings = await Settings.findOne();
    const quotation = await Quotation.findById(id)
      .populate("deal requestedBy approvedBy")
      .lean();

    if (!quotation)
      return res.status(404).json({ message: "Quotation not found" });

    // 2. PREPARE DATA
    const withGstQuery = String(req.query.gst || "true").toLowerCase();
    const withGst = withGstQuery === "true" || withGstQuery === "1";

    const rawItems = quotation.items ?? quotation.products ?? [];
    const normalized = normalizeItems(rawItems, quotation);
    const itemsForPdf = buildItemsForPdf(
      normalized,
      withGst,
      quotation.marginType || "percentage",
      quotation.marginValue || 0,
    );

    // Totals Calculation
    const freightCharges = Number(quotation.freightCharges || 0);
    const freightGstRate = Number(quotation.freightGstRate || 0);
    const freightGstAmount = withGst
      ? (freightCharges * freightGstRate) / 100
      : 0;
    const freightTotal = freightCharges + freightGstAmount;

    // --- FIX: RENAMED VARIABLES TO MATCH EJS OBJECT ---
    const installationCharges = Number(quotation.installationCharges || 0);
    const installationGstRate = Number(quotation.installationGstRate || 0);
    const installationGstAmount = withGst
      ? (installationCharges * installationGstRate) / 100
      : 0;
    const installationTotal = installationCharges + installationGstAmount;

    const itemsBaseTotal = itemsForPdf.reduce(
      (s, it) => s + (it.baseAmount || 0),
      0,
    );
    const itemsGstTotal = itemsForPdf.reduce(
      (s, it) => s + (it.gstAmount || 0),
      0,
    );
    const itemsTotal = itemsForPdf.reduce((s, it) => s + (it.total || 0), 0);
    const grandTotal =
      itemsTotal +
      (withGst ? freightTotal : freightCharges) +
      (withGst ? installationTotal : installationCharges);

    // Subject & Recipient Logic
    const opportunityDesc =
      (quotation.deal && quotation.deal.detailedDescription) ||
      (quotation.deal && quotation.deal.description) ||
      "";
    const subjectLine =
      opportunityDesc && String(opportunityDesc).trim()
        ? `Transaction quotation for ${String(opportunityDesc).trim()}`
        : quotation.subject || `Transaction Quotation`;

    const clientAddress =
      quotation.clientAddress ||
      (quotation.deal && formatAddress(quotation.deal.address)) ||
      "";
    const recipientName =
      (quotation.deal && quotation.deal.customer) ||
      quotation.recipientName ||
      "Valued Customer";

    // 3. IMAGE PROCESSING
    let headerDataUri = null;
    let footerDataUri = null;

    const defaultHeaderPath = path.join(
      __dirname,
      "..",
      "templates",
      "header.png",
    );
    const defaultFooterPath = path.join(
      __dirname,
      "..",
      "templates",
      "footer.png",
    );

    if (settings && settings.headerImage) {
      const filename = path.basename(settings.headerImage);
      const localPath = path.join(
        __dirname,
        "..",
        "uploads",
        "config",
        filename,
      );
      headerDataUri = getBase64Image(localPath);
    }
    if (!headerDataUri) headerDataUri = getBase64Image(defaultHeaderPath);

    if (settings && settings.footerImage) {
      const filename = path.basename(settings.footerImage);
      const localPath = path.join(
        __dirname,
        "..",
        "uploads",
        "config",
        filename,
      );
      footerDataUri = getBase64Image(localPath);
    }
    if (!footerDataUri) footerDataUri = getBase64Image(defaultFooterPath);

    // 4. RENDER TEMPLATE
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "quotation.ejs",
    );
    if (!fs.existsSync(templatePath))
      throw new Error(`Template not found at ${templatePath}`);

    const html = await ejs.renderFile(templatePath, {
      quotation,
      items: itemsForPdf,
      withGst,
      itemsBaseTotal,
      itemsGstTotal,
      itemsTotal,
      freightCharges,
      freightGstRate,
      freightGstAmount,
      freightTotal,
      installationCharges,
      installationGstAmount,
      installationTotal, // Variables now exist!
      grandTotal,
      recipientName,
      requesterName: quotation.requestedBy?.firstName || "Salesperson",
      approverName: quotation.approvedBy?.firstName || "",
      subjectLine,
      clientAddress,
      headerImage: headerDataUri,
      footerImage: footerDataUri,
      companyName:
        settings?.companyName ||
        process.env.COMPANY_NAME ||
        "Your Company Pvt. Ltd.",
      companyAddress: process.env.COMPANY_ADDRESS || "",
      companyPhone: process.env.COMPANY_PHONE || "",
    });

    // 5. PUPPETEER GENERATION
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    };
    if (process.env.PUPPETEER_EXEC_PATH)
      launchOptions.executablePath = process.env.PUPPETEER_EXEC_PATH;

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    browser = null;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Quotation-${id}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("PDF Error:", err);
    if (browser) await browser.close();
    res
      .status(500)
      .json({ message: "PDF Generation Failed", error: err.message });
  }
});

module.exports = router;
