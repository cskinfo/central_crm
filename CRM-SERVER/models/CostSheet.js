const mongoose = require("mongoose");

const CostSheetSchema = new mongoose.Schema({
  deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", required: true },

  // --- NEW: PURCHASE ORDER FILE STORAGE ---
  poFile: {
    filename: { type: String }, // e.g. "PO-174823.pdf"
    originalName: { type: String }, // e.g. "Invoice.pdf"
    path: { type: String }, // Full Public URL
    uploadedAt: { type: Date },
  },
  // ---------------------------------------

  // 1. Revenue
  totalRevenue: { type: Number, required: true, default: 0 },

  // 2. Direct Costs
  products: [
    {
      name: String,
      qty: { type: Number, default: 0 },
      oemPrice: { type: Number, default: 0 },
      totalOemCost: { type: Number, default: 0 },
    },
  ],
  totalProductCost: { type: Number, default: 0 },

  // 3. Manpower
  manpower: [
    {
      profile: String,
      qty: { type: Number, default: 0 },
      year1Cost: { type: Number, default: 0 },
      year2Cost: { type: Number, default: 0 },
      year3Cost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
    },
  ],
  totalManpowerCost: { type: Number, default: 0 },

  // 4. Overheads & Operations
  totalGstCost: { type: Number, default: 0 },
  freightCost: { type: Number, default: 0 },
  installationCost: { type: Number, default: 0 },

  adminOverheadPercent: { type: Number, default: 1 },
  adminOverheadValue: { type: Number, default: 0 },
  financeCost: { type: Number, default: 0 },
  insuranceCost: { type: Number, default: 0 },
  gemCost: { type: Number, default: 0 },
  miscCost: { type: Number, default: 0 },

  // Custom Charges
  customCharges: [
    {
      name: { type: String, default: "" },
      amount: { type: Number, default: 0 },
    },
  ],
  totalCustomCharges: { type: Number, default: 0 },

  // 5. Final Calculations
  totalProjectCost: { type: Number, default: 0 },
  netMarginValue: { type: Number, default: 0 },
  netMarginPercent: { type: Number, default: 0 },

  // Versioning
  version: { type: Number, default: 1 },
  isLatest: { type: Boolean, default: true },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
CostSheetSchema.index({ deal: 1, version: 1 });
CostSheetSchema.index({ deal: 1, isLatest: 1 });

module.exports = mongoose.model("ProjectCostSheet", CostSheetSchema);
