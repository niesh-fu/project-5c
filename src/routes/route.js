const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
const cartController =require("../controllers/cartController")

const middleware = require("../middlewares/auth");
//=================================================================================================================
//User API'S
router.post("/register", userController.registerUser);

router.post("/login", userController.loginUser);

router.get("/user/:userId/profile", middleware.authentication, userController.getUserProfile);

router.put("/user/:userId/profile", middleware.authentication, userController.updateUserProfile);

//===================================================================================================================
//Product Api's
router.post("/products", productController.createProduct)
router.get("/products", productController.getProductByFilter)
router.get("/products/:productId",productController.getProductById)
router.put("/products/:productId",productController.updateProduct)
router.delete("/products/:productId",productController.deleteProductById)
//====================================================================================================================
//Cart Api's
router.post('/users/:userId/cart',middleware.authentication, cartController.createCart)
router.put('/users/:userId/cart',middleware.authentication,cartController.updateCart)
router.get('/users/:userId/cart',middleware.authentication,cartController.getCartByUserId)
router.delete('/users/:userId/cart',middleware.authentication, cartController.deleteCartByUserId)
//=====================================================================================================================



// if api is invalid OR wrong URL
router.all("/*", function (req, res) {
  res.status(404).send({ status: false, msg: "The api you requested is not available" });
});

module.exports = router;
