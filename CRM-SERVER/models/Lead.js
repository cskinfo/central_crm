// Lead.js
const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String, required: true },
  industry: { type: String },
  source: {
    type: String,
    enum: [
      "Website",
      "Referral",
      "Campaign",
      "Cold Call",
      "Advertisement",
      "Other",
    ],
    default: "Website",
  },

  productInterest: { type: String },
  rating: {
    type: String,
    enum: ["Hot", "Warm", "Cold"],
    default: "Warm",
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  leadOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tags: [{ type: String }],
  conversionStatus: { type: String },
  followUpDate: { type: Date },
  remarks: { type: String },
  communicationHistory: [
    {
      type: { type: String, enum: ["Email", "Call", "Meeting", "Other"] },
      date: { type: Date, default: Date.now },
      summary: String,
      details: String,
      performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ],
  stage: {
    type: String,
    enum: [
      "Initial Contact",
      "Proposal Sent",
      "Negotiation",
      "Closed Won",
      "Closed Lost",
    ],
    default: "Initial Contact",
  },
  attachments: [
    {
      name: String,
      url: String,
      type: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  notes: { type: String },
});

module.exports = mongoose.model("Lead", LeadSchema);
