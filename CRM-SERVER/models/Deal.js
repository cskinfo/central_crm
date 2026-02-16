// models/Deal.js
const mongoose = require("mongoose");

/**
 * Address subdocument schema
 * Stored on a Deal so quotations can print recipient address
 */
const AddressSchema = new mongoose.Schema(
  {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "" },
  },
  { _id: false }
);

const DealSchema = new mongoose.Schema({
  opportunityId: { type: String, unique: true },
  opportunityDate: { type: Date, default: Date.now },
  customer: { type: String, required: true },
  contactName: { type: String, required: true },
  accountManager: { type: String },
  type: { type: String, enum: ["Product", "Services"], required: true },

  // UPDATED: Added default: "" to ensure it is never undefined
  detailedDescription: { type: String, default: "" },

  contactEmail: { type: String },
  contactPhone: { type: String },

  // Address copied from Lead when creating opportunity from a Lead
  address: { type: AddressSchema, default: () => ({}) },

  oem: { type: String },
  expectedRevenue: { type: Number, required: true }, // in Lacs
  expectedMargin: { type: Number },
  stage: {
    type: String,
    enum: ["New", "Qualified", "Proposition", "Won", "Lost"],
    default: "New",
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  currentStatus: { type: String },
  closureMonth: { type: String },

  // UPDATED: Added default: "" for consistency
  remark: { type: String, default: "" },

  expectedClosureDate: { type: Date, required: true },
  probability: { type: Number, min: 0, max: 100 },
  salespersonId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  customerType: {
    type: String,
    enum: ["Individual", "Business", "Enterprise"],
  },
  lifetimeValue: { type: Number },
  quotationStatus: { type: String, enum: ["Pending", "Approved", "Rejected"] },
});

// Pre-save hook to generate opportunity ID
DealSchema.pre("save", function (next) {
  if (!this.opportunityId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.opportunityId = `OPP-${year}${month}${day}-${randomNum}`;
  }
  next();
});

const Deal = mongoose.model("Deal", DealSchema);

module.exports = Deal;
