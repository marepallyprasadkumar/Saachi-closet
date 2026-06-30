const Order = require("../models/Order");
const Product = require("../models/Product");

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getAdminSummary = async (_req, res, next) => {
  try {
    const [orders, products] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).populate("items.product", "category"),
      Product.find().sort({ createdAt: -1 }),
    ]);

    const paidOrConfirmed = orders.filter(
      (order) => order.paymentStatus === "paid" || ["confirmed", "shipped", "delivered"].includes(order.status)
    );

    const revenue = paidOrConfirmed.reduce((sum, order) => sum + (order.total || 0), 0);
    const activeProducts = products.filter((product) => product.isActive);
    const lowStockProducts = products.filter(
      (product) => product.isActive && product.stock > 0 && product.stock <= (product.lowStockThreshold || 5)
    );
    const outOfStockProducts = products.filter((product) => product.isActive && product.stock === 0);

    const today = startOfDay(new Date());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const dailyMap = new Map();
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(sevenDaysAgo);
      day.setDate(sevenDaysAgo.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, orders: 0, revenue: 0 });
    }

    orders.forEach((order) => {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        const row = dailyMap.get(key);
        row.orders += 1;
        row.revenue += order.total || 0;
      }
    });

    const categorySales = {};
    const productSales = {};

    paidOrConfirmed.forEach((order) => {
      order.items.forEach((item) => {
        const qty = item.qty || 0;
        const category = item.product?.category || "uncategorized";
        categorySales[category] = (categorySales[category] || 0) + qty;
        productSales[item.name] = (productSales[item.name] || 0) + qty;
      });
    });

    const uniqueCustomers = new Set(
      orders
        .map((order) => order.customer?.phone || order.customer?.email || order.shippingAddress?.pincode)
        .filter(Boolean)
    );

    res.json({
      totals: {
        revenue,
        orders: orders.length,
        customers: uniqueCustomers.size,
        products: activeProducts.length,
        pendingOrders: orders.filter((order) => order.status === "pending").length,
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
      },
      recentOrders: orders.slice(0, 8),
      lowStockProducts,
      outOfStockProducts,
      dailyPerformance: Array.from(dailyMap.values()),
      bestProducts: Object.entries(productSales)
        .map(([name, sold]) => ({ name, sold }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 6),
      categoryPerformance: Object.entries(categorySales)
        .map(([name, sold]) => ({ name, sold }))
        .sort((a, b) => b.sold - a.sold),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminSummary };
