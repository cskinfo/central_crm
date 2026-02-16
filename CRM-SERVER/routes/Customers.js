// Customers.js
const express = require("express");
const router = express.Router();
const Deal = require("../models/Deal"); // Add Deal model import
const jwt = require("jsonwebtoken");

// Get all customers (only deals with stage "Won")
router.get("/", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let query = { stage: "Won" };

    if (decoded.role === "salesperson") {
      query.salespersonId = decoded.id;
    }

    const customers = await Deal.find(query).sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer stats
router.get("/stats", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let matchQuery = { stage: "Won" };

    if (decoded.role === "salesperson") {
      matchQuery.salespersonId = decoded.id;
    }

    const stats = await Deal.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          newThisWeek: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    "$createdAt",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    res.json(stats[0] || { totalCustomers: 0, newThisWeek: 0 });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
