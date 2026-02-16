// server/routes/leads.js
const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const jwt = require("jsonwebtoken");

// Create a new lead (accessible by both admin and salesperson)
// Add this at the top of your route file
router.use(express.json()); // Ensure JSON parsing

// Add raw body parser middleware specifically for this route
router.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);

router.post("/", async (req, res) => {
  try {
    // 1. Verify Token & Role
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // 2. INTELLIGENT ASSIGNMENT LOGIC
    let finalLeadOwner = req.body.leadOwner;
    let finalAssignedTo = req.body.assignedTo;

    // Clean up empty strings coming from Frontend (Fixes the crash)
    if (finalLeadOwner === "") finalLeadOwner = null;
    if (finalAssignedTo === "") finalAssignedTo = null;

    // --- LOGIC CHANGE ---
    // If the user is NOT an Admin (i.e., Salesperson), force the lead to belong to them.
    if (decoded.role !== "admin") {
      finalLeadOwner = decoded.id; // Owner is the Salesperson
      finalAssignedTo = decoded.id; // Assigned to the Salesperson
    }
    // If Admin, we keep the values selected in the dropdown (or null)

    // 3. Prepare Data
    const leadData = {
      ...req.body,

      // Apply our logic variables
      leadOwner: finalLeadOwner,
      assignedTo: finalAssignedTo,

      // Ensure Creator is always set
      createdBy: decoded.id,

      // Fallbacks
      email: req.body.email || "no-email@example.com",
      phone: req.body.phone || "0000000000",
    };

    // Fix Date Error: Remove followUpDate if it's an empty string
    if (leadData.followUpDate === "") delete leadData.followUpDate;

    // 4. Save to DB
    const newLead = new Lead(leadData);
    const savedLead = await newLead.save();

    res.status(201).json(savedLead);
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get leads (admin sees all, salesperson sees only their own)
router.get("/", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let query = {};
    if (decoded.role === "salesperson") {
      query.$or = [{ assignedTo: decoded.id }, { createdBy: decoded.id }];
    }

    const leads = await Lead.find(query)
      .populate("assignedTo", "username firstName lastName")
      .populate("leadOwner", "username firstName lastName")
      .populate("createdBy", "username firstName lastName")
      .sort({ createdAt: -1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single lead by ID
router.get("/:id", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "username firstName lastName")
      .populate("leadOwner", "username firstName lastName")
      .populate("createdBy", "username firstName lastName");

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Check if user is authorized to view this lead
    if (
      decoded.role === "salesperson" &&
      !lead.assignedTo?.equals(decoded.id) &&
      !lead.createdBy.equals(decoded.id)
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ... keep the rest of your existing routes (update, delete, etc.)

// Update lead
router.put("/:id", async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };

    // Handle address updates
    if (req.body.address) {
      updateData.$set = { address: req.body.address };
    }

    const lead = await Lead.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).populate("assignedTo leadOwner", "username firstName lastName");

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Delete lead
router.delete("/:id", async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Handle quick actions
router.post("/:id/actions", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { actionType, details } = req.body;
    if (!actionType) {
      return res.status(400).json({ error: "Action type is required" });
    }

    const validActions = ["Email", "Call", "Meeting", "Note"];
    if (!validActions.includes(actionType)) {
      return res.status(400).json({ error: "Invalid action type" });
    }

    const actionEntry = {
      type: actionType,
      date: new Date(),
      summary: details?.summary || `${actionType} action performed`,
      details: details?.details || "",
      performedBy: decoded.id,
    };

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: { communicationHistory: actionEntry },
        $set: { updatedAt: new Date() },
      },
      { new: true },
    ).populate(
      "assignedTo leadOwner createdBy communicationHistory.performedBy",
      "username firstName lastName",
    );

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
