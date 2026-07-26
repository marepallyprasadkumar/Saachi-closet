// models/Order.js — MongoDB schema for customer orders
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  size:     { type: String, required: true },
  color:    { type: String, default: '' },
  qty:      { type: Number, required: true, min: 1 },
  image:    { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    customer: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },

    items: [orderItemSchema],

    shippingAddress: {
      street:  { type: String, required: true },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      pincode: { type: String, required: true },
    },

    subtotal:      { type: Number, required: true },
    discount: {
      code: { type: String, default: '' },
      amount: { type: Number, default: 0 },
    },
    shippingCost:  { type: Number, default: 0 },
    total:         { type: Number, required: true },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'unpaid', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    // ✅ Razorpay details added here
    razorpay: {
      orderId: String,
      paymentId: String,
      signature: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
