const express = require("express");
const {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  applyOffer,
} = require("../controllers/offerController");

const router = express.Router();

router.get("/", getOffers);
router.post("/", createOffer);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);
router.post("/:id/apply", applyOffer);

module.exports = router;
