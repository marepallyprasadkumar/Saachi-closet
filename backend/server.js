const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const offerRoutes = require("./routes/offers");
const authRoutes = require("./routes/auth");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("DB Error:", err.message);
    process.exit(1);
  });

// Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (_req, res) => {
  res.send("API is running...");
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// ====== PERMANENT PORT HANDLER ======
const DEFAULT_PORT = process.env.PORT || 5000;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1); // automatically try next port
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer(DEFAULT_PORT);

// Optional: graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  process.exit();
});
