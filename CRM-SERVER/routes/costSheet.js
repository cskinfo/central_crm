const express = require("express");
const router = express.Router();
const ProjectCostSheet = require("../models/CostSheet");
const Deal = require("../models/Deal");
const Quotation = require("../models/Quotation");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ftp = require("basic-ftp");

// --- 1. LOCAL TEMP STORAGE (AWS) ---
const tempDir = "temp_uploads/";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
const upload = multer({ 
  dest: tempDir,
  fileSize: 20 * 1024 * 1024,
  fieldSize: 20 * 1024 * 1024  
});

// --- 2. HOSTINGRAJA FTP CONFIGURATION ---
const FTP_CONFIG = {
  host: "ftp.wwitsolution.com",
  user: "crm_docs_uploader@doc.wwitsolution.com",
  password: "i03vqc8klvws",
  secure: false,
};

// --- 3. MAPPING CONFIGURATION ---
const REMOTE_FOLDER_PATH = "/assets/uploads/po";
const PUBLIC_URL_BASE = "https://doc.wwitsolution.com/assets/uploads/po/";

// ==========================================
//      UPLOAD ROUTE (Robust "Upsert" Logic)
// ==========================================
router.post(
  "/:id/upload-po",
  auth,
  upload.single("poFile"),
  async (req, res) => {
    const client = new ftp.Client();

    try {
      const dealId = req.params.id;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 1. Generate Filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const remoteFilename =
        "PO-" + uniqueSuffix + path.extname(req.file.originalname);

      // 2. FTP Upload
      try {
        await client.access(FTP_CONFIG);
        await client.ensureDir(REMOTE_FOLDER_PATH);
        await client.uploadFrom(req.file.path, remoteFilename);
      } catch (ftpErr) {
        console.error("FTP Error:", ftpErr);
        return res
          .status(502)
          .json({ error: "FTP Connection Failed: " + ftpErr.message });
      }

      // 3. Prepare Data
      const fullPublicUrl = PUBLIC_URL_BASE + remoteFilename;

      const poFileData = {
        filename: remoteFilename,
        originalName: req.file.originalname,
        path: fullPublicUrl,
        uploadedAt: new Date(),
      };

      // 4. ATOMIC DB UPDATE
      const updatedSheet = await ProjectCostSheet.findOneAndUpdate(
        { deal: dealId },
        {
          $set: {
            poFile: poFileData,
            updatedBy: req.user.id,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            totalRevenue: 0,
            products: [],
            manpower: [],
            customCharges: [],
            version: 1,
            isLatest: true,
          },
        },
        { new: true, upsert: true },
      );

      // 5. Cleanup Temp File
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Cleanup error:", err);
      });

      res.json({
        message: "PO Uploaded Successfully",
        poFile: updatedSheet.poFile,
      });
    } catch (err) {
      console.error("Upload Error:", err);
      res.status(500).json({ error: "Server Error: " + err.message });
    } finally {
      client.close();
    }
  },
);

// --- GET: Fetch Cost Sheet ---
router.get("/deal/:dealId", auth, async (req, res) => {
  try {
    let sheet = await ProjectCostSheet.findOne({
      deal: req.params.dealId,
      isLatest: true,
    });
    if (sheet) return res.json(sheet);

    // Auto-Calc Logic if New
    const deal = await Deal.findById(req.params.dealId);
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const quotation = await Quotation.findOne({
      deal: req.params.dealId,
      status: "Approved",
    }).sort({ updatedAt: -1 });

    let autoProducts = [];
    let autoFreight = 0;
    let autoInstall = 0;
    let autoGst = 0;

    if (quotation) {
      const rawItems = quotation.items || quotation.products || [];
      autoProducts = rawItems.map((item) => {
        const qty = Number(item.qty || 0);
        const vendorPrice = Number(item.unitPrice || 0);
        const gstRate = Number(item.gstRate || 0);
        const baseTotal = qty * vendorPrice;
        const itemGst = (baseTotal * gstRate) / 100;
        autoGst += itemGst;
        return {
          name: item.productName,
          qty: qty,
          oemPrice: vendorPrice,
          totalOemCost: baseTotal,
        };
      });
      autoFreight = Number(quotation.freightCharges || 0);
      autoInstall = Number(quotation.installationCharges || 0);

      const freightGst =
        (autoFreight * Number(quotation.freightGstRate || 0)) / 100;
      const installGst =
        (autoInstall * Number(quotation.installationGstRate || 0)) / 100;
      autoGst += freightGst + installGst;
    }

    return res.json({
      isNew: true,
      dealId: deal._id,
      totalRevenue: deal.expectedRevenue || 0,
      products: autoProducts,
      freightCost: autoFreight,
      installationCost: autoInstall,
      totalGstCost: autoGst,
      manpower: [],
      customCharges: [],
      adminOverheadPercent: 1,
      financeCost: 0,
      gemCost: 0,
      miscCost: 0,
      insuranceCost: 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//      SAVE COST SHEET
// ==========================================
router.post("/", auth, async (req, res) => {
  try {
    const {
      dealId,
      createNewVersion,
      products,
      manpower,
      customCharges,
      adminOverheadPercent,
      financeCost,
      totalRevenue,
      gemCost,
      miscCost,
      insuranceCost,
      freightCost,
      installationCost,
      totalGstCost,
    } = req.body;

    console.log(`Saving Sheet for Deal: ${dealId}`);

    // --- 1. CALCULATIONS ---
    let totalProductCost = 0;
    const procProducts = (products || []).map((p) => {
      const t = Number(p.qty || 0) * Number(p.oemPrice || 0);
      totalProductCost += t;
      return { ...p, totalOemCost: t };
    });

    let totalManpowerCost = 0;
    const procManpower = (manpower || []).map((m) => {
      const t =
        Number(m.year1Cost || 0) +
        Number(m.year2Cost || 0) +
        Number(m.year3Cost || 0);
      totalManpowerCost += t;
      return { ...m, totalCost: t };
    });

    let totalCustomCharges = 0;
    const procCustomCharges = (customCharges || []).map((c) => {
      const amt = Number(c.amount || 0);
      totalCustomCharges += amt;
      return { ...c, amount: amt };
    });

    const baseCost = totalProductCost + totalManpowerCost;

    // --- FIX: ADDED FALLBACK '|| 0' TO PREVENT NaN ---
    const adminOverheadValue =
      baseCost * (Number(adminOverheadPercent || 0) / 100);

    const totalProjectCost =
      baseCost +
      adminOverheadValue +
      Number(financeCost || 0) +
      Number(insuranceCost || 0) +
      Number(gemCost || 0) +
      Number(miscCost || 0) +
      Number(freightCost || 0) +
      Number(installationCost || 0) +
      Number(totalGstCost || 0) +
      totalCustomCharges;

    const netMarginValue = Number(totalRevenue || 0) - totalProjectCost;
    const netMarginPercent =
      Number(totalRevenue || 0) > 0
        ? (netMarginValue / Number(totalRevenue)) * 100
        : 0;

    // --- 2. DATA PREPARATION ---
    const dataToSave = {
      totalRevenue,
      products: procProducts,
      totalProductCost,
      manpower: procManpower,
      totalManpowerCost,
      customCharges: procCustomCharges,
      totalCustomCharges,
      adminOverheadPercent: Number(adminOverheadPercent || 0), // Save robust value
      adminOverheadValue,
      financeCost,
      insuranceCost,
      gemCost,
      miscCost,
      freightCost,
      installationCost,
      totalGstCost,
      totalProjectCost,
      netMarginValue,
      netMarginPercent,
      updatedBy: req.user.id,
      updatedAt: new Date(),
      isLatest: true,
    };

    // --- 3. DATABASE OPERATION ---
    const updateOperation = {
      $set: dataToSave,
      $inc: { version: createNewVersion ? 1 : 0 },
    };

    const savedSheet = await ProjectCostSheet.findOneAndUpdate(
      { deal: dealId },
      updateOperation,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    console.log("Sheet Saved Successfully");
    return res.json(savedSheet);
  } catch (err) {
    console.error("Save Cost Sheet Error:", err);
    res.status(500).json({ error: "Save Failed: " + err.message });
  }
});

module.exports = router;
