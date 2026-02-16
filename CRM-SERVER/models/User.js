// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  // Existing fields
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // Hiding password by default
  role: { type: String, enum: ["admin", "sub-admin", "salesperson"], required: true }, // MODIFIED
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values for email
    validate: {
      validator: function (v) {
        // Simple email validation regex
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email address!`,
    },
  },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  
  // --- NEW FIELDS ADDED HERE ---
  phone: { type: String, trim: true },
  zone: { type: String, trim: true },
  empId: { type: String, trim: true, unique: true, sparse: true },
  doj: { type: Date }, // Date of Joining

  // Existing fields
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model("User", userSchema);