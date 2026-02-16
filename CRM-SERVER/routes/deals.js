// routes/deals.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Deal = require("../models/Deal");
const Lead = require("../models/Lead");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware to get user from JWT
const getUserFromToken = (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const POPULATE_FIELDS = [
  { path: "assignedTo", select: "username firstName lastName" },
  { path: "salespersonId", select: "username firstName lastName" }, // Use salespersonId as creator
];

// Helper to create user-friendly validation error messages
const createFriendlyError = (error) => {
  if (error.name === "ValidationError") {
    const messages = Object.keys(error.errors)
      .map((key) => {
        const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
        return `${fieldName} is a required field.`;
      })
      .join(" ");
    return `Please fix the following: ${messages}`;
  }
  return error.message;
};

// =================================================================
// SPECIFIC GET ROUTES (must be before /:id)
// =================================================================

// GET /api/deals/report
router.get("/report", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) {
      return res.status(401).json({ error: "Authorization token required" });
    }
    const query = {};
    let userFilterId = null;
    if (decoded.role === "salesperson") {
      userFilterId = decoded.id;
    } else if (
      decoded.role === "admin" &&
      req.query.userId &&
      req.query.userId !== "all"
    ) {
      if (req.query.userId === "admin") {
        const adminUser = await User.findOne({ username: "admin" });
        if (adminUser) userFilterId = adminUser._id.toString();
      } else {
        userFilterId = req.query.userId;
      }
    }
    if (userFilterId) {
      query.$or = [
        { assignedTo: userFilterId },
        { salespersonId: userFilterId },
      ];
    }
    if (req.query.dateRange && req.query.dateRange !== "all") {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      switch (req.query.dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          const firstDayOfWeek = now.getDate() - now.getDay();
          startDate = new Date(now.setDate(firstDayOfWeek));
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case "custom":
          if (req.query.fromDate && req.query.toDate) {
            startDate = new Date(req.query.fromDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(req.query.toDate);
            endDate.setHours(23, 59, 59, 999);
          }
          break;
      }
      if (
        req.query.dateRange !== "custom" ||
        (req.query.fromDate && req.query.toDate)
      ) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }
    if (req.query.stage && req.query.stage !== "all") {
      query.stage = req.query.stage;
    }

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: "i" };
      const searchOr = [
        { customer: searchRegex },
        { contactName: searchRegex },
        { opportunityId: searchRegex },
        { type: searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const deals = await Deal.find(query)
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    res.json(deals);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// /api/deals/by-lead/:leadId
router.get("/by-lead/:leadId", async (req, res) => {
  try {
    const leadId = req.params.leadId;
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    const opps = await Deal.find({ customer: lead.company });
    res.json(opps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/deals/stats
router.get("/stats", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    let matchQuery = {};
    if (decoded.role === "salesperson") {
      matchQuery.$or = [
        { assignedTo: decoded.id },
        { salespersonId: decoded.id },
      ];
    }

    const stats = await Deal.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          expectedRevenue: { $sum: "$expectedRevenue" },
        },
      },
      {
        $project: {
          stage: "$_id",
          count: 1,
          expectedRevenue: 1,
          _id: 0,
        },
      },
    ]);

    const wonRevenue =
      stats.find((x) => x.stage === "Won")?.expectedRevenue || 0;
    stats.forEach((stat) => {
      if (stat.stage === "Won") {
        stat.totalRevenue = wonRevenue;
      }
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/deals/activity
router.get("/activity", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const { timeRange = "month" } = req.query;
    let matchQuery = {};
    if (decoded.role === "salesperson") {
      matchQuery.$or = [
        { assignedTo: new mongoose.Types.ObjectId(decoded.id) },
        { salespersonId: new mongoose.Types.ObjectId(decoded.id) },
      ];
    }
    const now = new Date();
    let groupBy = {};
    if (timeRange === "week") {
      matchQuery.createdAt = {
        $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      };
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    } else if (timeRange === "year") {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      matchQuery.createdAt = { $gte: yearAgo };
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
    } else {
      // Default to month
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      matchQuery.createdAt = { $gte: monthAgo };
      groupBy = {
        year: { $year: "$createdAt" },
        week: { $isoWeek: "$createdAt" },
      };
    }
    const activity = await Deal.aggregate([
      { $match: matchQuery },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } },
    ]);
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =================================================================
// GENERAL & DYNAMIC ROUTES
// =================================================================

// GET /api/deals
router.get("/", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    let query = {};
    if (decoded.role === "salesperson") {
      query.$or = [{ assignedTo: decoded.id }, { salespersonId: decoded.id }];
    }
    // Sort by createdAt in descending order to show newest first
    const deals = await Deal.find(query).populate(POPULATE_FIELDS).sort({ createdAt: -1 });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/deals/:id
router.get("/:id", async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id).populate(POPULATE_FIELDS);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/deals
router.post("/", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const dealData = { ...req.body, salespersonId: decoded.id };
    dealData.assignedTo =
      decoded.role === "admin" && req.body.assignedTo
        ? req.body.assignedTo
        : decoded.id;

    const deal = new Deal(dealData);
    await deal.save();
    await deal.populate(POPULATE_FIELDS);
    res.status(201).json(deal);
  } catch (error) {
    res.status(400).json({ error: createFriendlyError(error) });
  }
});

// POST /api/deals/bulk
router.post("/bulk", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    if (!Array.isArray(req.body))
      return res
        .status(400)
        .json({ error: "Request body must be an array of opportunities" });
    const opportunities = req.body.map((deal) => {
      const date = new Date();
      const random = Math.floor(1000 + Math.random() * 9000);
      const opportunityId = `OPP-${date.getFullYear().toString().slice(-2)}${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}${date
        .getDate()
        .toString()
        .padStart(2, "0")}-${random}`;
      return {
        ...deal,
        opportunityId,
        assignedTo: deal.assignedTo || decoded.id,
        salespersonId: deal.salespersonId || decoded.id,
        stage: deal.stage || "New",
      };
    });
    const createdDeals = await Deal.insertMany(opportunities, {
      ordered: false,
    });
    res.status(201).json(createdDeals);
  } catch (error) {
    res.status(400).json({
      error: "Bulk import failed",
      details: createFriendlyError(error),
    });
  }
});

// PUT /api/deals/:id
router.put("/:id", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const dealToUpdate = await Deal.findById(req.params.id);
    if (!dealToUpdate) return res.status(404).json({ error: "Deal not found" });

    if (
      decoded.role === "salesperson" &&
      req.body.assignedTo &&
      dealToUpdate.assignedTo?.toString() !== req.body.assignedTo
    ) {
      return res
        .status(403)
        .json({ error: "You are not authorized to reassign deals." });
    }

    const updateData = { ...req.body };
    if ("assignedTo" in updateData && updateData.assignedTo === "") {
      updateData.assignedTo = null;
    }

    const updatedDeal = await Deal.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate(POPULATE_FIELDS);
    res.json(updatedDeal);
  } catch (error) {
    res.status(400).json({ error: createFriendlyError(error) });
  }
});

// DELETE /api/deals/bulk-delete
router.delete("/bulk-delete", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "An array of opportunity IDs is required." });
    }

    if (decoded.role === "salesperson") {
      const deals = await Deal.find({ _id: { $in: ids } });
      const unauthorizedDeals = deals.filter(
        (deal) =>
          deal.salespersonId.toString() !== decoded.id &&
          deal.assignedTo.toString() !== decoded.id
      );
      if (unauthorizedDeals.length > 0) {
        return res.status(403).json({
          error:
            "You are not authorized to delete one or more of the selected opportunities.",
        });
      }
    }

    const result = await Deal.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ error: "No matching opportunities found to delete." });
    }

    res.json({
      message: `${result.deletedCount} opportunit${
        result.deletedCount > 1 ? "ies" : "y"
      } deleted successfully.`,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ error: "Server error during bulk deletion." });
  }
});

// DELETE /api/deals/:id
router.delete("/:id", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });
    const deletedDeal = await Deal.findByIdAndDelete(req.params.id);
    if (!deletedDeal) return res.status(404).json({ error: "Deal not found" });
    res.json({ message: "Deal deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;