const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Broadcast = require("../models/Broadcast");
const User = require("../models/User");

// Helper to get user info from token
const getUserFromToken = (req) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// POST /api/broadcasts - Admin sends a new broadcast
router.post("/", async (req, res) => {
  const adminUser = getUserFromToken(req);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ message: "Unauthorized: Admins only" });
  }

  const { title, message, recipients } = req.body;
  if (!title || !message || !recipients || recipients.length === 0) {
    return res.status(400).json({ message: "Title, message, and recipients are required." });
  }

  try {
    let recipientIds = [];
    if (recipients.includes("everyone")) {
      const allSalespersons = await User.find({ role: 'salesperson' }).select('_id');
      recipientIds = allSalespersons.map(user => user._id);
    } else {
      recipientIds = recipients;
    }

    const newBroadcast = new Broadcast({
      title,
      message,
      sender: adminUser.id,
      recipients: recipientIds,
    });

    await newBroadcast.save();
    res.status(201).json(newBroadcast);
  } catch (err) {
    res.status(500).json({ message: "Server error while creating broadcast." });
  }
});

// GET /api/broadcasts - User fetches their received broadcasts
router.get("/", async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const query = user.role === 'admin' 
      ? { sender: user.id } // Admin sees messages they sent
      : { recipients: user.id }; // Salesperson sees messages they received

    const broadcasts = await Broadcast.find(query)
      .populate('sender', 'username')
      .populate('recipients', 'username')
      .sort({ createdAt: -1 });
      
    res.json(broadcasts);
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching broadcasts." });
  }
});

// GET /api/broadcasts/unread-count - Get count of unread messages
router.get("/unread-count", async (req, res) => {
    const user = getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const count = await Broadcast.countDocuments({
            recipients: user.id,
            readBy: { $ne: user.id } // Count where user's ID is NOT in the readBy array
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/broadcasts/:id/mark-read - Mark a message as read
router.post("/:id/mark-read", async (req, res) => {
    const user = getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const broadcast = await Broadcast.findOneAndUpdate(
            { _id: req.params.id, recipients: user.id },
            { $addToSet: { readBy: user.id } }, // $addToSet prevents duplicate entries
            { new: true }
        );
        if (!broadcast) return res.status(404).json({ message: "Broadcast not found" });
        res.json({ message: "Marked as read" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;