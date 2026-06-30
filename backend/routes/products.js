const express = require('express');

const {
  getProducts,
  getAdminProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getNewArrivals,
  getProductsByCategory
} = require('../controllers/productController');

const upload = require('../middleware/upload');

// (Optional) admin middleware if you add later
// const { isAdmin } = require('../middleware/auth');

const router = express.Router();


// ======================
// ✅ PUBLIC ROUTES
// ======================

// 🔥 IMPORTANT: specific routes MUST come before /:id

// Get all products (with filters, pagination)
router.get('/', getProducts);

// New arrivals (latest products)
router.get('/new-arrivals', getNewArrivals);

// Admin product list, including inactive products
router.get('/admin/all', getAdminProducts);

// Products by category
router.get('/category/:category', getProductsByCategory);

// Get single product
router.get('/:id', getProductById);


// ======================
// ✅ ADMIN / CREATE / UPDATE
// ======================

// Create product (image upload)
router.post(
  '/',
  upload.fields([
    { name: 'media', maxCount: 8 },
    { name: 'image', maxCount: 1 },
  ]),
  createProduct
  // add isAdmin here later
);

// Update product
router.put(
  '/:id',
  upload.fields([
    { name: 'media', maxCount: 8 },
    { name: 'image', maxCount: 1 },
  ]),
  updateProduct
  // add isAdmin here later
);

// Soft delete product
router.delete(
  '/:id',
  deleteProduct
  // add isAdmin here later
);


module.exports = router;
