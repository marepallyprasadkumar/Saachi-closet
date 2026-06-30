const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const {
  placeOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");

const Order = require("../models/Order");

const router = express.Router();

/* =======================
   🔐 RAZORPAY INSTANCE
======================= */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =======================
   💳 CREATE ORDER (RAZORPAY)
======================= */
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

/* =======================
   ✅ VERIFY PAYMENT + SAVE ORDER
======================= */
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cart,
      userId,
      address,
      customer,
      discount,
    } = req.body;

    console.log("VERIFY API HIT");

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
      qty: item.quantity,
      image: item.product.image,
    }));

    const subtotal = items.reduce(
      (acc, item) => acc + item.price * item.qty,
      0
    );

    const discountAmount = Math.max(0, Number(discount?.amount || 0));

    const orderPayload = {
      items,
      shippingAddress: address,
      customer,
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
    };

    if (userId && userId !== "dummyUserId") {
      orderPayload.user = userId;
    }

    const order = await Order.create(orderPayload);

    await Promise.all(
      items.map((item) =>
        require("../models/Product").findByIdAndUpdate(item.product, {
          $inc: { stock: -item.qty },
        })
      )
    );

    return res.json({
      success: true,
      message: "Payment verified & order saved",
      order,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

/* =======================
   🆕 GET USER ORDERS (FIXED)
======================= */
router.get("/user/:userId", async (req, res) => {
  try {
    console.log("FIXED USER ORDERS API HIT");

    // 🔥 TEMP FIX
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =======================
   🛒 EXISTING ROUTES
======================= */

router.post("/", placeOrder);
router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
