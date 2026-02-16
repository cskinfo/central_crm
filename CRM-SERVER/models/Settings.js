const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: "Your Company Pvt. Ltd." }, // <--- ADDED
  headerImage: { type: String, default: "" },
  footerImage: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Settings", SettingsSchema);
