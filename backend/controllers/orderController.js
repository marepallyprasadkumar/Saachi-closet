// controllers/orderController.js — Full working version

const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

// ✅ POST /api/orders — Place Order (NO LOGIN REQUIRED)
const placeOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, customer } = req.body;

    if (!items || items.length === 0) {
      res.status(400);
      throw new Error("No order items");
    }

    // ✅ Verify products from DB (IMPORTANT SECURITY)
    const verifiedItems = await Promise.all(
      items.map(async (item) => {
        if (!mongoose.Types.ObjectId.isValid(item.product)) {
          throw new Error("Invalid product ID");
        }

        const product = await Product.findById(item.product);

        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }

        return {
          product: product._id,
          name: product.name,
          price: product.price,
          size: item.size || "",
          qty: item.qty || 1,
          image: product.image,
        };
      })
    );

    // ✅ Price calculations
    const subtotal = verifiedItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const shippingCost = subtotal >= 999 ? 0 : 99;
    const total = subtotal + shippingCost;

    // ✅ Create order (no user required for now)
    const order = await Order.create({
      items: verifiedItems,
      shippingAddress,
      customer,
      subtotal,
      shippingCost,
      total,
      status: "pending",
      paymentStatus: "pending",
    });

    await Promise.all(
      verifiedItems.map((item) =>
        Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.qty },
        })
      )
    );

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/orders — Get all orders (for now, no auth)
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate("items.product", "category stock");
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/orders/:id — Single order
const getOrderById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Invalid order ID");
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// ✅ PUT /api/orders/:id/status — Update status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    const messages = [];
    if (status) messages.push(`Your order #${order._id.toString().slice(-8)} is now ${status}.`);
    if (paymentStatus) messages.push(`Payment for order #${order._id.toString().slice(-8)} is ${paymentStatus}.`);

    await Promise.all(
      messages.map((message) =>
        Notification.create({
          customerName: order.customer?.name || "",
          phone: order.customer?.phone || "",
          email: order.customer?.email || "",
          order: order._id,
          type: message.startsWith("Payment") ? "payment" : "order",
          channel: "in_app",
          message,
          status: "sent",
        })
      )
    );

    res.json(order);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  placeOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};
