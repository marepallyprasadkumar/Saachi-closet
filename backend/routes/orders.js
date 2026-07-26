const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const {
  placeOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");

const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/create-order", async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

router.post("/verify-payment", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cart,
      address,
      customer,
      discount,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment details are required" });
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ success: false, message: "Cart items are required" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    const items = cart.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      size: item.size,
      color: item.color || "",
      qty: item.quantity,
      image: item.product.image,
    }));

    const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    const discountAmount = Math.max(0, Number(discount?.amount || 0));
    const orderCustomer = {
      name: customer?.name || req.user.name || "",
      phone: customer?.phone || req.user.phone || "",
      email: customer?.email || req.user.email || "",
    };

    const order = await Order.create({
      userId: req.user._id,
      items,
      shippingAddress: address,
      customer: orderCustomer,
      subtotal,
      discount: {
        code: discount?.code || "",
        amount: discountAmount,
      },
      total: Math.max(0, subtotal - discountAmount),
      paymentStatus: "paid",
      status: "confirmed",
      razorpay: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
    });

    await Promise.all(
      items.map((item) =>
        Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.qty },
        })
      )
    );

    return res.json({
      success: true,
      message: "Payment verified and order saved",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
});

router.get("/my", protect, getMyOrders);

router.post("/", protect, placeOrder);
router.get("/", getAllOrders);
router.get("/:id", protect, getOrderById);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
