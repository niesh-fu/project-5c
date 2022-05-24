const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");


const middleware = require("../middlewares/auth");



// if api is invalid OR wrong URL
router.all("/*", function (req, res) {
  res
    .status(404)
    .send({ status: false, msg: "The api you requested is not available" });
});

module.exports = router;
