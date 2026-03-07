const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Settings = require("../models/Settings");

// Configure Multer for Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/config/"); // Make sure this folder exists in your project
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// GET All Settings
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

// ADD New Branding Template
router.post(
  "/update-branding",
  upload.fields([{ name: "headerImage" }, { name: "footerImage" }]),
  async (req, res) => {
    try {
      let settings = await Settings.findOne();
      if (!settings) settings = new Settings();

      const newTemplate = {
        name: req.body.templateName || "New Template",
        companyName: req.body.companyName || "Your Company Pvt. Ltd.",
        headerImage: "",
        footerImage: "",
        isDefault: settings.templates.length === 0 
      };

      if (req.files && req.files["headerImage"]) {
        newTemplate.headerImage = `${req.protocol}://${req.get("host")}/uploads/config/${req.files["headerImage"][0].filename}`;
      }

      if (req.files && req.files["footerImage"]) {
        newTemplate.footerImage = `${req.protocol}://${req.get("host")}/uploads/config/${req.files["footerImage"][0].filename}`;
      }

      settings.templates.push(newTemplate);
      settings.updatedAt = new Date();
      await settings.save();

      res.json({ message: "Template added successfully", settings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

// DELETE a Template
router.delete("/templates/:id", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (settings) {
      settings.templates = settings.templates.filter(t => t._id.toString() !== req.params.id);
      await settings.save();
    }
    res.json({ message: "Template deleted", settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;