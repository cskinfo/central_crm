const mongoose = require("mongoose");

const BroadcastSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  sender: { type: String, required: true },
  recipients: [{ type: String }],
  readBy: [{ type: String }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Broadcast", BroadcastSchema);