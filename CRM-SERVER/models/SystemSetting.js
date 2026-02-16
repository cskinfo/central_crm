const mongoose = require("mongoose");

const SystemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., "navbar_greeting"
  value: {
    text: { type: String, default: "Welcome to CRM" },
    isEnabled: { type: Boolean, default: false },
    gradientStart: { type: String, default: "#B8860B" }, // Gold
    gradientEnd: { type: String, default: "#FFD700" }   // Yellow
  }
}, { timestamps: true });

module.exports = mongoose.model("SystemSetting", SystemSettingSchema);