const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    customerName: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    type: {
      type: String,
      enum: ["order", "payment", "promotion", "support"],
      default: "order",
    },
    channel: {
      type: String,
      enum: ["in_app", "email", "sms"],
      default: "in_app",
    },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "sent", "failed"],
      default: "queued",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
