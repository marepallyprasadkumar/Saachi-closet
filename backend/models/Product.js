const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },

    originalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    category: {
      type: String,
      enum: [
        'dresses',
        'skirts',
        'tops',
        'accessories',
        'jackets',
        'jewelry',
        'jeans'
      ],
      required: true,
    }, // ✅ FIXED (comma added)

    colours: {
      type: [String],
      default: [],
    },

    sizes: {
      type: [String],
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', '28', '30', '32', '34', '36'],
      default: ['S', 'M', 'L', 'XL'],
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },

    tag: {
      type: String,
      default: '',
    },

    image: {
      type: String, // filename stored in /uploads
      default: '',
    },

    images: {
      type: [String],
      default: [],
    },

    videos: {
      type: [String],
      default: [],
    },

    variants: [
      {
        sku: { type: String, default: '' },
        size: { type: String, default: '' },
        colour: { type: String, default: '' },
        image: { type: String, default: '' },
        images: { type: [String], default: [] },
        stock: { type: Number, default: 0, min: 0 },
        price: { type: Number, default: 0, min: 0 },
      }
    ],

    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      keywords: { type: [String], default: [] },
    },

    sizeChart: {
      type: String,
      default: '',
    },

    supplier: {
      name: { type: String, default: '' },
      contact: { type: String, default: '' },
    },

    featured: {
      type: Boolean,
      default: false,
    },

    isNew: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
