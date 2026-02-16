const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Import Models
const Settings = require("../models/Settings"); // PDF Branding
const SystemSetting = require("../models/SystemSetting"); // Greeting

// --- CONFIG: Image Storage for PDF Branding ---
const uploadDir = "uploads/config/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});
const upload = multer({ storage });

/* =========================================================
   SECTION 1: PDF BRANDING ROUTES (Settings.js Model)
   ========================================================= */

// GET Branding Settings
router.get("/", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE Branding Images & Name
router.post(
  "/update-branding",
  upload.fields([{ name: "headerImage" }, { name: "footerImage" }]),
  async (req, res) => {
    try {
      let settings = await Settings.findOne();
      if (!settings) settings = new Settings();

      if (req.body.companyName) settings.companyName = req.body.companyName;

      if (req.files["headerImage"]) {
        const filename = req.files["headerImage"][0].filename;
        settings.headerImage = `${req.protocol}://${req.get("host")}/uploads/config/${filename}`;
      }

      if (req.files["footerImage"]) {
        const filename = req.files["footerImage"][0].filename;
        settings.footerImage = `${req.protocol}://${req.get("host")}/uploads/config/${filename}`;
      }

      settings.updatedAt = new Date();
      await settings.save();

      res.json({ message: "Branding updated successfully", settings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },
);

/* =========================================================
   SECTION 2: GREETING ROUTES (SystemSetting.js Model)
   ========================================================= */

// GET Greeting
router.get("/greeting", async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: "navbar_greeting" });

    // If doesn't exist, return default values
    if (!setting) {
      return res.json({
        text: "Welcome to CRM",
        isEnabled: false,
        gradientStart: "#B8860B",
        gradientEnd: "#FFD700",
      });
    }

    res.json(setting.value);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SAVE Greeting
router.post("/greeting", async (req, res) => {
  try {
    const { text, isEnabled, gradientStart, gradientEnd } = req.body;

    // Upsert (Update if exists, Create if not)
    const setting = await SystemSetting.findOneAndUpdate(
      { key: "navbar_greeting" },
      {
        $set: {
          value: {
            text,
            isEnabled,
            gradientStart,
            gradientEnd,
          },
        },
      },
      { new: true, upsert: true },
    );

    res.json({ message: "Greeting updated", data: setting.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
