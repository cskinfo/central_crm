// models/Quotation.js
const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    description: { type: String, default: "" },
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    qty: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true, default: 0 }, // Vendor Price
    targetPrice: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const QuotationSchema = new mongoose.Schema(
  {
    deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", required: true },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    items: [ItemSchema],
    amount: { type: Number, default: 0 },
    validUntil: { type: Date },
    remarksForAdmin: { type: String, default: "" },
    remarksForSalesperson: { type: String, default: "" },
    freightCharges: { type: Number, default: 0 },
    freightGstRate: { type: Number, default: 0 },
    freightGstAmount: { type: Number, default: 0 },
    installationCharges: { type: Number, default: 0 },
    installationGstRate: { type: Number, default: 0 },
    installationGstAmount: { type: Number, default: 0 },

    // --- Margin Fields ---
    marginType: {
      type: String,
      enum: ["percentage", "amount"],
      default: "percentage",
    },
    marginValue: { type: Number, default: 0 },

    // --- NEW: Notification Flag ---
    isRead: { type: Boolean, default: false },
    // ------------------------------

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", QuotationSchema);
