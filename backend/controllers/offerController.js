const Offer = require("../models/Offer");
const Product = require("../models/Product");

const discountedPrice = (price, offer) => {
  if (offer.discountType === "fixed") return Math.max(0, price - offer.value);
  return Math.max(0, Math.round(price - (price * offer.value) / 100));
};

const getOffers = async (_req, res, next) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    next(err);
  }
};

const createOffer = async (req, res, next) => {
  try {
    const offer = await Offer.create(req.body);
    res.status(201).json(offer);
  } catch (err) {
    next(err);
  }
};

const updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!offer) {
      res.status(404);
      throw new Error("Offer not found");
    }

    res.json(offer);
  } catch (err) {
    next(err);
  }
};

const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      res.status(404);
      throw new Error("Offer not found");
    }

    res.json({ message: "Offer deleted" });
  } catch (err) {
    next(err);
  }
};

const applyOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      res.status(404);
      throw new Error("Offer not found");
    }

    const filter = { isActive: true };
    if (offer.category && offer.category !== "all") filter.category = offer.category;

    const products = await Product.find(filter);

    await Promise.all(
      products.map((product) => {
        const basePrice = product.originalPrice && product.originalPrice > product.price
          ? product.originalPrice
          : product.price;

        product.originalPrice = basePrice;
        product.price = discountedPrice(basePrice, offer);
        product.tag = offer.title;
        return product.save();
      })
    );

    res.json({ message: "Offer applied", affectedProducts: products.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  applyOffer,
};
