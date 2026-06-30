// controllers/productController.js — Updated with category + new arrivals + pagination

const Product = require('../models/Product');
const mongoose = require('mongoose');

const parseJsonField = (data, field) => {
  if (typeof data[field] === 'string' && data[field].trim()) {
    data[field] = JSON.parse(data[field]);
  }
};

const normalizeProductPayload = (req) => {
  const data = { ...req.body };

  ['colours', 'sizes', 'variants', 'videos', 'seo', 'supplier'].forEach((field) =>
    parseJsonField(data, field)
  );

  if (typeof data.featured === 'string') data.featured = data.featured === 'true';
  if (typeof data.isActive === 'string') data.isActive = data.isActive === 'true';
  if (typeof data.category === 'string') data.category = data.category.trim().toLowerCase();

  const uploadedFiles = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  if (uploadedFiles.length) {
    const imageFiles = uploadedFiles
      .filter((file) => file.mimetype.startsWith('image/'))
      .map((file) => file.filename);
    const videoFiles = uploadedFiles
      .filter((file) => file.mimetype.startsWith('video/'))
      .map((file) => file.filename);

    if (imageFiles.length) {
      data.image = imageFiles[0];
      data.images = imageFiles;
    }
    if (videoFiles.length) data.videos = videoFiles;
  }

  if (req.file) {
    data.image = req.file.filename;
    data.images = [req.file.filename];
  }

  return data;
};


// ✅ GET /api/products  — list with filters + pagination
const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      colour,
      search,
      sort,
      page = 1,
      limit = 12
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = String(category).trim().toLowerCase();
    if (colour) filter.colours = { $in: [colour] };
    if (search) filter.name = { $regex: search, $options: 'i' };

    let query = Product.find(filter);

    // ✅ Sorting
    if (sort === 'price_asc') query = query.sort({ price: 1 });
    if (sort === 'price_desc') query = query.sort({ price: -1 });
    if (sort === 'newest') query = query.sort({ createdAt: -1 });

    // ✅ Pagination (VERY IMPORTANT for your UI)
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(Number(limit));

    const products = await query;
    const total = await Product.countDocuments(filter);

    res.json({
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });

  } catch (err) {
    next(err);
  }
};

// GET /api/products/admin/all - full product list for admin inventory
const getAdminProducts = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
};


// ✅ GET /api/products/new-arrivals
const getNewArrivals = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 }) // latest first
      .limit(8);

    res.json(products);
  } catch (err) {
    next(err);
  }
};


// ✅ GET /api/products/category/:category
const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const products = await Product.find({
      category,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    next(err);
  }
};


// ✅ GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Invalid product ID");
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};


// ✅ POST /api/products (admin)
const createProduct = async (req, res, next) => {
  try {
    const data = normalizeProductPayload(req);
    const product = await Product.create(data);

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};


// ✅ PUT /api/products/:id (admin)
const updateProduct = async (req, res, next) => {
  try {
    const data = normalizeProductPayload(req);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};


// ✅ DELETE /api/products/:id (soft delete)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  getProducts,
  getAdminProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,

  // ✅ NEW EXPORTS
  getNewArrivals,
  getProductsByCategory
};
