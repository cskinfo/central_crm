// require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const path = require("path");

// 1. IMPORT UPDATED AUTH MIDDLEWARE
const authMiddleware = require("./middleware/auth");

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
const userRoutes = require("./routes/users");

const app = express();

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
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
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

app.get("/api", (req, res) => {
  res.status(200).json({ message: "CRM API is running" });
});

// 2. REGISTER PROTECTED ROUTES USING THE MIDDLEWARE
// Local login endpoint is removed because login is now external
app.use("/api/settings", authMiddleware, settingsRoutes);
app.use("/api/todos", authMiddleware, todosRouter);
app.use("/api/customers", authMiddleware, customersRouter);
app.use("/api/leads", authMiddleware, leadsRouter);
app.use("/api/deals", authMiddleware, dealsRouter);
app.use("/api/broadcasts", authMiddleware, broadcastRouter);
app.use("/api/project-cost", authMiddleware, projectCostRoutes);
app.use("/api/quotations", authMiddleware, quotationRoutes);
app.use("/api/quotation-pdf", authMiddleware, quotationPdfRouter);
app.use("/api/users", authMiddleware, userRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();