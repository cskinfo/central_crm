// require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const path = require("path");

// Import Routes
const dealsRouter = require("./routes/deals");
const leadsRouter = require("./routes/Leads");
const customersRouter = require("./routes/Customers");
const todosRouter = require("./routes/Todos");
const broadcastRouter = require("./routes/broadcasts");
const projectCostRoutes = require("./routes/costSheet");
const quotationRoutes = require("./routes/quotations");
const quotationPdfRouter = require("./routes/quotationPdf");
const settingsRoutes = require("./routes/settings");

const app = express();

// ---------------------------------------------------------
// 1. FIX: UPDATED CORS CONFIGURATION
// ---------------------------------------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "http://crm.cskinfotech.com/",
  "http://43.205.210.227",
  "http://43.205.210.227:80",
  "http://43.205.210.227:5000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      // Check if the origin is in our allowed list
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      // AUTO-ALLOW FIX: This allows your AWS domain to work without manually adding it to the list above.
      // In a strict production environment, you might want to disable this and strictly use the array.
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.path}`);
  next();
});

// Handle root router
app.get("/api", (req, res) => {
  res.status(200).json({ message: "CRM API is running" });
});

// ---------------------------------------------------------
// 2. REGISTER ROUTES
// ---------------------------------------------------------
app.use("/api/settings", settingsRoutes);
app.use("/api/todos", todosRouter);
app.use("/api/customers", customersRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/broadcasts", broadcastRouter);
app.use("/api/project-cost", projectCostRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/quotation-pdf", quotationPdfRouter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "crm_database",
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

// Initialize with admin user if doesn't exist
const initializeAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
      await User.create({
        username: "admin",
        password: "admin123",
        role: "admin",
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        isActive: true,
      });
      console.log("👑 Admin user created");
    }
  } catch (err) {
    console.error("❌ Admin initialization error:", err.message);
  }
};

// Enhanced login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Enhanced user creation endpoint (admin only)
app.post("/api/users", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { username, password, role, email, firstName, lastName } = req.body;

    const newUser = await User.create({
      username,
      password,
      role,
      email,
      firstName,
      lastName,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: {
        username: newUser.username,
        role: newUser.role,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        createdAt: newUser.createdAt,
        isActive: newUser.isActive,
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// Get all users (admin only)
app.get("/api/users", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const users = await User.find().select(
      "-password -passwordResetToken -passwordResetExpires",
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single user by ID (admin only)
app.get("/api/users/:id", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: Allow user to fetch their own profile, otherwise restrict to admin
    if (decoded.role !== "admin" && decoded.id !== req.params.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Enhanced user update endpoint
app.put("/api/users/:id", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Allow Admins OR the user themselves to update their profile
    if (decoded.role !== "admin" && decoded.id !== req.params.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Capture ALL fields, including the new ones
    const {
      username,
      role,
      email,
      firstName,
      lastName,
      isActive,
      phone,
      zone,
      empId,
      doj,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        username,
        role,
        email,
        firstName,
        lastName,
        isActive,
        phone,
        zone,
        empId,
        doj,
      },
      { new: true, runValidators: true }, // runValidators ensures email format is checked
    ).select("-password");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete user endpoint
app.delete("/api/users/:id", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
});

// Placeholders for other endpoints
// Admin Force Password Reset
app.post("/api/users/:id/force-password-reset", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    // --- FIX HERE: Extract 'newPassword' instead of 'password' ---
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 6 chars" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Password Reset Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
app.post("/api/users/reset-password-request", async (req, res) => {});
app.post("/api/users/reset-password", async (req, res) => {});
// 1. Make sure the route is used
app.use("/api/settings", require("./routes/settings"));
// 2. Make sure the uploads folder is public (so Puppeteer can reach the images)
app.use("/uploads", express.static("uploads"));
// Start server after DB connects
const startServer = async () => {
  await connectDB();
  await initializeAdmin();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
