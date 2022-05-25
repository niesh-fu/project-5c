const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const middleware = require("../middlewares/auth");

router.post("/register",userController.registerUser);

router.post("/login",userController.loginUser);

router.get("/user/:userId/profile",middleware.authentication,userController.getUserProfile);

router.put("/user/:userId/profile",middleware.authentication,userController.updateUserProfile);

// if api is invalid OR wrong URL
router.all("/*", function (req, res) {
  res.status(404).send({ status: false, msg: "The api you requested is not available" });
});

module.exports = router;
