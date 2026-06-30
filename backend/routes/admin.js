const express = require("express");
const { getAdminSummary } = require("../controllers/adminController");

const router = express.Router();

router.get("/summary", getAdminSummary);

module.exports = router;
