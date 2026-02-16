// routes/quotations.js
const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const Deal = require("../models/Deal");
const auth = require("../middleware/auth");

// Utility — calculate GST & totals for each item
function calculateItemValues(item) {
  const baseAmount = Number(item.unitPrice || 0) * Number(item.qty || 0);
  const gstRate = Number(item.gstRate || 0);

  const gstAmount = (baseAmount * gstRate) / 100;
  const total = baseAmount + gstAmount;

  return { baseAmount, gstAmount, total };
}

// Utility — calculate freight totals
function calculateFreight(freightCharges, freightGstRate) {
  freightCharges = Number(freightCharges || 0);
  freightGstRate = Number(freightGstRate || 0);

  const freightGstAmount = (freightCharges * freightGstRate) / 100;
  const freightTotal = freightCharges + freightGstAmount;

  return { freightGstAmount, freightTotal };
}

/* ================================
      NOTIFICATION ROUTES (NEW)
   ================================ */

// 1. GET PENDING COUNT (For Admin Sidebar)
router.get("/stats/pending-count", auth, async (req, res) => {
  try {
    const count = await Quotation.countDocuments({ status: "Pending" });
    res.json({ count });
  } catch (error) {
    console.error("Error fetching pending count:", error);
    res.status(500).json({ count: 0 });
  }
});

// 2. GET UNREAD NOTIFICATIONS (For Salesperson Bell)
router.get("/stats/notifications", auth, async (req, res) => {
  try {
    const notifications = await Quotation.find({
      requestedBy: req.user.id,
      status: "Approved",
      isRead: false,
    })
      .populate("deal", "opportunityId customer")
      .sort({ updatedAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json([]);
  }
});

// 3. MARK NOTIFICATIONS AS READ
router.put("/stats/mark-read", auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    await Quotation.updateMany(
      { _id: { $in: ids } },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================================
      1. SALES PERSON REQUEST
   ================================ */
router.post("/request", auth, async (req, res) => {
  try {
    const { dealId, items, remarksForAdmin, validUntil } = req.body;

    if (!dealId || !items || !items.length) {
      return res
        .status(400)
        .json({ message: "Invalid quotation request data" });
    }

    // Only minimal fields are allowed for salesperson
    const normalizedItems = items.map((i) => ({
      productName: i.productName,
      description: i.description || "",
      qty: Number(i.qty || 1),
      unitPrice: Number(i.unitPrice || 0), // This is the Vendor Price (initially same)
      targetPrice: Number(i.unitPrice || 0), // <--- SAVE TARGET PRICE
      gstRate: Number(i.gstRate || 0),
      gstAmount: 0,
      total: 0,
      brand: "",
      model: "",
    }));

    const newQuotation = new Quotation({
      deal: dealId,
      requestedBy: req.user.id,
      items: normalizedItems,
      remarksForAdmin: remarksForAdmin || "",
      validUntil,
      status: "Pending",
    });

    await newQuotation.save();

    // Mark the Deal as having a pending quotation
    await Deal.findByIdAndUpdate(dealId, { quotationStatus: "Pending" });

    return res.status(201).json(newQuotation);
  } catch (error) {
    console.error("Quotation request error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

/* ================================
      2. ADMIN APPROVAL ROUTE
   ================================ */
router.post("/:id/approve", auth, async (req, res) => {
  try {
    const quotationId = req.params.id;

    // 1. Extract fields from body
    const {
      items,
      remarksForSalesperson,
      freightCharges,
      freightGstRate,
      installationCharges,
      installationGstRate,
      validUntil,
    } = req.body;

    const quotation = await Quotation.findById(quotationId).populate(
      "deal requestedBy approvedBy"
    );

    if (!quotation)
      return res.status(404).json({ message: "Quotation not found" });

    if (quotation.status === "Approved") {
      return res.status(400).json({ message: "Quotation already approved" });
    }

    // 2. Update Items (Calculations)
    let updatedItems = items.map((it) => {
      const { baseAmount, gstAmount, total } = calculateItemValues(it);

      return {
        productName: it.productName,
        description: it.description,
        brand: it.brand,
        model: it.model,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice), // Admin's Updated Price
        targetPrice: Number(it.targetPrice || 0), // Preserve Target Price
        gstRate: Number(it.gstRate),
        gstAmount,
        total,
      };
    });

    // 3. Calculate Freight
    const { freightGstAmount, freightTotal } = calculateFreight(
      freightCharges,
      freightGstRate
    );

    // 4. Calculate Installation
    const instCharge = Number(installationCharges || 0);
    const instRate = Number(installationGstRate || 0);
    const installationGstAmount = (instCharge * instRate) / 100;
    const installationTotal = instCharge + installationGstAmount;

    // 5. Compute Grand Total
    const itemsTotal = updatedItems.reduce((sum, item) => sum + item.total, 0);

    // Add Installation & Freight to Final Amount
    const finalAmount = itemsTotal + freightTotal + installationTotal;

    // 6. Save Updates to Quotation Object
    quotation.items = updatedItems;
    quotation.status = "Approved";
    quotation.approvedBy = req.user.id;
    quotation.amount = finalAmount;
    quotation.remarksForSalesperson = remarksForSalesperson || "";

    quotation.freightCharges = Number(freightCharges || 0);
    quotation.freightGstRate = Number(freightGstRate || 0);
    quotation.freightGstAmount = freightGstAmount;

    quotation.installationCharges = instCharge;
    quotation.installationGstRate = instRate;
    quotation.installationGstAmount = installationGstAmount;

    quotation.validUntil = validUntil || quotation.validUntil;

    // Reset isRead to false so salesperson gets notified
    quotation.isRead = false;

    await quotation.save();

    // 7. Update Deal Status
    await Deal.findByIdAndUpdate(quotation.deal._id, {
      quotationStatus: "Approved",
    });

    return res.json({ message: "Quotation approved", quotation });
  } catch (error) {
    console.error("Approve quotation error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

/* ================================
      3. REJECT
   ================================ */
router.post("/:id/reject", auth, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Not found" });

    quotation.status = "Rejected";
    quotation.remarksForSalesperson = req.body.remarksForSalesperson || "";
    // Reset isRead to false so salesperson gets notified of rejection too (optional)
    quotation.isRead = false;

    await quotation.save();

    await Deal.findByIdAndUpdate(quotation.deal, {
      quotationStatus: "Rejected",
    });

    return res.json({ message: "Quotation rejected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// List all quotations
router.get("/", auth, async (req, res) => {
  try {
    const status = req.query.status;
    const q = {};
    if (status && String(status).trim() && status !== "All") {
      q.status = status;
    }

    const quotations = await Quotation.find(q)
      .populate("deal requestedBy approvedBy")
      .sort({ createdAt: -1 });

    return res.json(quotations);
  } catch (err) {
    console.error("Error loading quotations list:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ================================
      4. LIST QUOTATIONS OF DEAL
   ================================ */
router.get("/deal/:dealId", auth, async (req, res) => {
  try {
    const quotations = await Quotation.find({ deal: req.params.dealId })
      .populate("requestedBy approvedBy")
      .sort({ createdAt: -1 });

    res.json(quotations);
  } catch (err) {
    console.error("Error loading quotations:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================================
      5. GET SINGLE QUOTATION
   ================================ */
router.get("/:id", auth, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate(
      "deal requestedBy approvedBy"
    );

    if (!quotation) return res.status(404).json({ message: "Not found" });

    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ================================
      6. UPDATE PENDING REQUEST (SALESPERSON)
   ================================ */
router.put("/:id", auth, async (req, res) => {
  try {
    const { items, specialRequirements, validUntil } = req.body;
    const quotationId = req.params.id;

    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status !== "Pending") {
      return res.status(403).json({
        message: "Cannot edit a quotation that is already processed.",
      });
    }

    if (
      quotation.requestedBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized to edit this quotation." });
    }

    if (items && items.length > 0) {
      const normalizedItems = items.map((i) => ({
        productName: i.productName,
        description: i.description || "",
        qty: Number(i.qty || 1),
        unitPrice: Number(i.unitPrice || 0),
        gstRate: Number(i.gstRate || 0),
        gstAmount: 0,
        total: 0,
        brand: "",
        model: "",
      }));
      quotation.items = normalizedItems;
    }

    if (specialRequirements !== undefined) {
      quotation.remarksForAdmin = specialRequirements;
    }

    if (validUntil) {
      quotation.validUntil = validUntil;
    }

    await quotation.save();

    return res.json({ message: "Quotation updated successfully", quotation });
  } catch (error) {
    console.error("Quotation update error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

/* ================================
      7. UPDATE MARGIN (Salesperson)
   ================================ */
router.put("/:id/margin", auth, async (req, res) => {
  try {
    const { marginType, marginValue } = req.body;
    const quotationId = req.params.id;

    const quotation = await Quotation.findById(quotationId);
    if (!quotation)
      return res.status(404).json({ message: "Quotation not found" });

    if (quotation.status !== "Approved") {
      return res
        .status(400)
        .json({ message: "Can only add margin to Approved quotations." });
    }

    quotation.marginType = marginType;
    quotation.marginValue = Number(marginValue || 0);

    await quotation.save();

    return res.json({ message: "Margin updated successfully", quotation });
  } catch (error) {
    console.error("Margin update error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
