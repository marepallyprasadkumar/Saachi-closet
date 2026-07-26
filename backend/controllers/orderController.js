const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "unpaid", "paid", "failed", "refunded"];

const placeOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, customer } = req.body;

    if (!req.user?._id) {
      res.status(401);
      throw new Error("Please login to place an order");
    }

    if (!items || items.length === 0) {
      res.status(400);
      throw new Error("No order items");
    }

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
          color: item.color || "",
          qty: item.qty || 1,
          image: product.image,
        };
      })
    );

    const subtotal = verifiedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shippingCost = subtotal >= 999 ? 0 : 99;
    const total = subtotal + shippingCost;
    const orderCustomer = {
      name: customer?.name || req.user.name || "",
      phone: customer?.phone || req.user.phone || "",
      email: customer?.email || req.user.email || "",
    };

    const order = await Order.create({
      userId: req.user._id,
      items: verifiedItems,
      shippingAddress,
      customer: orderCustomer,
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

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("items.product", "category stock");
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Invalid order ID");
    }

    const order = await Order.findById(req.params.id);

    if (!order || !order.userId || order.userId.toString() !== req.user._id.toString()) {
      res.status(404);
      throw new Error("Order not found");
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Invalid order ID");
    }

    if (!status && !paymentStatus) {
      res.status(400);
      throw new Error("Order status or payment status is required");
    }

    if (status && !ORDER_STATUSES.includes(status)) {
      res.status(400);
      throw new Error("Invalid order status");
    }

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      res.status(400);
      throw new Error("Invalid payment status");
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    const updates = {};
    if (status) updates.status = status;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });

    const messages = [];
    if (status) messages.push(`Your order #${updatedOrder._id.toString().slice(-8)} is now ${status}.`);
    if (paymentStatus) messages.push(`Payment for order #${updatedOrder._id.toString().slice(-8)} is ${paymentStatus}.`);

    await Promise.all(
      messages.map((message) =>
        Notification.create({
          customerName: updatedOrder.customer?.name || "",
          phone: updatedOrder.customer?.phone || "",
          email: updatedOrder.customer?.email || "",
          order: updatedOrder._id,
          type: message.startsWith("Payment") ? "payment" : "order",
          channel: "in_app",
          message,
          status: "sent",
        })
      )
    );

    res.json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  placeOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
};
