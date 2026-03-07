const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyName: { type: String, default: "Your Company Pvt. Ltd." },
  headerImage: { type: String, default: "" },
  footerImage: { type: String, default: "" },
  isDefault: { type: Boolean, default: false }
});

const SettingsSchema = new mongoose.Schema({
  // Legacy fields kept for backward compatibility so old quotes don't break
  companyName: { type: String, default: "Your Company Pvt. Ltd." }, 
  headerImage: { type: String, default: "" },
  footerImage: { type: String, default: "" },
  
  // New Array for Multiple Templates
  templates: [TemplateSchema],
  
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Settings", SettingsSchema);