const productModel = require('../models/productModel');
const { isValidRequestBody, isValid, isValidObjectId, isValidPrice } = require('../util/validation')
const { uploadFile } = require('../util/awsConnection')

const createProduct = async function (req, res) {

    try {

        const files = req.files;
        const requestBody = JSON.parse(JSON.stringify(req.body));

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request parameter, please provide product Details" })
        }

        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = requestBody;

        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: "title is required and it should contain only alphabets" })
        }

        const isTitleAlreadyPresent = await productModel.findOne({ title: title })
        if (isTitleAlreadyPresent) {
            return res.status(400).send({ status: false, message: `${title} is already used by another product!` });
        }

        if (!isValid(description)) {
            return res.status(400).send({ status: false, message: "description is required" })
        }

        if (isNaN(price) || !isValidPrice(price)) {
            return res.status(400).send({ status: false, message: "price is required and it should be valid" })
        }

        if (!isValid(currencyId) || currencyId != 'INR') {
            return res.status(400).send({ status: false, message: 'currencyId is required and it should be INR only' })
        }

        if (!isValid(currencyFormat) || currencyFormat != '₹') {
            return res.status(400).send({ status: false, message: 'currencyFormat is required and it should be ₹ only' })
        }

        if (requestBody.hasOwnProperty('isFreeShipping')) {
            if (!((isFreeShipping === "true") || (isFreeShipping === "false"))) {
                return res.status(400).send({ status: false, message: "isFreeShipping should have only true/false in it" });
            }
        }

        if (requestBody.hasOwnProperty('style')) {
            if (!isValid(style)) {
                return res.status(400).send({ status: false, message: "style should be valid" });
            }
        }

        if (requestBody.hasOwnProperty('installments')) {
            if (installments <= 0 || installments % 1 != 0) {
                return res.status(400).send({ status: false, message: "installments can not be a decimal number " })
            }
        }

        if (!isValid(availableSizes)) {
            return res.status(400).send({ status: false, message: "Atleast one product size should be give" })
        }

        let AVAILABLE_SIZES = availableSizes.toUpperCase().split(",");  // Creating an array with UPPERCASE values
        if (AVAILABLE_SIZES.length === 0) {
            return res.status(400).send({ status: false, message: "please provide the product sizes" })
        }

        for (let i = 0; i < AVAILABLE_SIZES.length; i++) {
            if (!(["S", "XS", "M", "X", "L", "XXL", "XL"]).includes(AVAILABLE_SIZES[i])) {
                return res.status(400).send({ status: false, message: `Sizes should be ${["S", "XS", "M", "X", "L", "XXL", "XL"]} value (with multiple value please give saperated by comma)` })
            }
        }

        if (!(files && files.length > 0)) {
            return res.status(400).send({ status: false, message: "Please provide product image" })
        }

        let productImage = await uploadFile(files[0]);

        const productData = {
            title: title, description: description, price: price,
            currencyId: currencyId, currencyFormat: currencyFormat, isFreeShipping: isFreeShipping,
            style: style, productImage: productImage, availableSizes: AVAILABLE_SIZES
        }

        const createdProduct = await productModel.create(productData)
        res.status(201).send({ status: true, message: "new product created successfully", data: createdProduct });

    } catch (err) {
        res.status(500).send({ status: false, msg: err.message })
    }
}

//========================================================================================================================================

const getProductByFilter = async function (req, res) {

    try {

        const query = req.query;
        let filters = { isDeleted: false }
        let sorting = {};

        const { size, name, priceGreaterThan, priceLessThan, priceSort } = query;


        if (query.hasOwnProperty('size')) {

            if (!isValid(size)) {
                return res.status(400).send({ status: false, message: `enter at least one size from:  S, XS, M, X, L, XXL, XL` })
            }

            let AVAILABLE_SIZES = size.toUpperCase().split(",");
            for (let i = 0; i < AVAILABLE_SIZES.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"]).includes(AVAILABLE_SIZES[i])) {
                    return res.status(400).send({ status: false, message: `Sizes should be ${["S", "XS", "M", "X", "L", "XXL", "XL"]} value (with multiple value please give saperated by comma)` })
                }
            }

            filters["availableSizes"] = { $in: AVAILABLE_SIZES }
        }


        if (query.hasOwnProperty('name')) {

            if (!isValid(name)) {
                return res.status(400).send({ status: false, message: "Name is not valid" });
            }

            filters["title"] = { $regex: name, $options: "i" };
        }


        if (query.hasOwnProperty('priceGreaterThan')) {

            if (isNaN(priceGreaterThan) || !isValidPrice(priceGreaterThan)) {
                return res.status(400).send({ status: false, message: "Greater than price should be valid" })
            }

            filters["price"] = { $gt: Number(priceGreaterThan) }
        }


        if (query.hasOwnProperty('priceLessThan')) {

            if (isNaN(priceLessThan) || !isValidPrice(priceLessThan)) {
                return res.status(400).send({ status: false, message: "Less than price should be valid" })
            }

            if (queryParams.hasOwnProperty("priceGreaterThan")) {
                filters["price"] = { $gt: Number(priceGreaterThan), $lt: Number(priceLessThan) };
            }

            filters["price"] = { $lt: Number(priceLessThan) };
        }


        if (query.hasOwnProperty('priceSort')) {

            if (!((priceSort == "-1") || (priceSort == "1"))) {
                return res.status(400).send({ status: false, message: "price sort should be a number:  -1 or 1" });
            }

            sorting["price"] = Number(priceSort);

            const products = await productModel.find(filters).sort(sorting);
            if (products.length === 0) {
                return res.status(404).send({ productStatus: false, message: 'No Product found' })
            }

            return res.status(200).send({ status: true, message: 'Product list', data: products })
        }

        const products = await productModel.find(filters);
        if (products.length === 0) {
            return res.status(404).send({ productStatus: false, message: 'No Product found' })
        }

        res.status(200).send({ status: true, message: 'Product list', data: products })

    } catch (err) {
        res.status(500).send({ status: false, msg: err.message })
    }
}


//========================================================================================================================================

const getProductById = async function (req, res) {
    try {

        const productId = req.params.productId;
        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Please provide valid productId" })
        }

        const productDetails = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!productDetails) {
            return res.status(404).send({ status: false, message: "No such product exists" })
        }

        res.status(200).send({ status: true, message: 'Success', data: productDetails })

    } catch (err) {
        res.status(500).send({ status: false, msg: err.message })
    }
}

//==================================================================================================================================================================

const updateProduct = async function (req, res) {
    try {
        const requestBody = req.body
        const productId = req.params.productId
        const productImage = req.files;

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid productId in params." })
        }

        if (!isValidRequestBody(requestBody) && req.files && req.files.length == 0) {
            return res.status(400).send({ status: false, message: 'No paramateres passed product unmodified' })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!product) {
            return res.status(404).send({ status: false, message: 'Product is not found' })
        }

        const { title, description, price, currencyId, isFreeShipping, style, availableSizes, installments } = requestBody;

        const updatedProductData = {}

        if (isValid(title)) {
            const isTitleAlreadyUsed = await productModel.findOne({ title: title });
            if (isTitleAlreadyUsed) {
                return res.status(400).send({ status: false, message: 'title is already used' })
            }
            if (!updatedProductData.hasOwnProperty['title']) {
                updatedProductData['title'] = title
            }
        }

        if (isValid(description)) {
            if (!updatedProductData.hasOwnProperty['description']) {
                updatedProductData['description'] = description
            }
        }

        if (isValid(price)) {
            if ((!(!isNaN(Number(price)))) || (price <= 0)) {
                return res.status(400).send({ status: false, message: `Price should be a valid number` })
            }
            if (!updatedProductData.hasOwnProperty['price']) {
                updatedProductData['price'] = price
            }
        }

        if (isValid(currencyId)) {
            if (!(currencyId == "INR")) {
                return res.status(400).send({ status: false, message: 'currencyId should be INR' })
            }
            if (!updatedProductData.hasOwnProperty['currencyId']) {
                updatedProductData['currencyId'] = currencyId
            }
        }

        if (isValid(isFreeShipping)) {
            if (!((isFreeShipping === "true") || (isFreeShipping === "false"))) {
                return res.status(400).send({ status: false, message: 'isFreeShipping should be true or false' })
            }
            if (!updatedProductData.hasOwnProperty['isFreeShipping']) {
                updatedProductData['isFreeShipping'] = isFreeShipping
            }
        }
        if (isValid(style)) {
            if (!updatedProductData.hasOwnProperty['style']) {
                updatedProductData['style'] = style
            }
        }
          if (isValid(availableSizes)) {
            let AVAILABLE_SIZES = availableSizes.toUpperCase().split(",");  // Creating an array with UPPERCASE values
            if (AVAILABLE_SIZES.length === 0) {
                return res.status(400).send({ status: false, message: "please provide the product sizes" })
            }
    
            for (let i = 0; i < AVAILABLE_SIZES.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"]).includes(AVAILABLE_SIZES[i])) {
                    return res.status(400).send({ status: false, message: `Sizes should be ${["S", "XS", "M", "X", "L", "XXL", "XL"]} value (with multiple value please give saperated by comma)` })
                }
            }

            if (!updatedProductData.hasOwnProperty['availableSizes']) {
                updatedProductData['availableSizes'] = AVAILABLE_SIZES;
            }
              
          }

        if (isValid(installments)) {
            if (!(!isNaN(Number(installments)))) {
                return res.status(400).send({ status: false, message: `Installments should be a valid number` })
            }
            if (!updatedProductData.hasOwnProperty['installments']) {
                updatedProductData['installments'] = installments
            }
        }


        if (productImage && !productImage.length == 0) {   //Undefined.length will not work in JS
            if (!isValidRequestBody(productImage)) {
                return res.status(400).send({ status: false, msg: "Invalid request parameters. Provide productImage." });
            }
            const downloadUrl = await awsFile.uploadFile(productImage[0]);
            if (!updatedProductData.hasOwnProperty['productImage']) {
                updatedProductData['productImage'] = downloadUrl
            }
        }

        const updatedProduct = await productModel.findOneAndUpdate({ _id: productId }, updatedProductData, { new: true })
        return res.status(200).send({ status: true, message: 'Successfully updated', data: updatedProduct });

    } catch (err) {
        return res.status(500).send({ status: false, msg: err.message });
    }
}

//================================================================================================================================================

const deleteProductById = async function (req, res) {
    try {
        const params = req.params.productId; //accessing theproductId from the params.

        //validation for the invalid params.
        if (!isValidObjectId(params)) {
            return res.status(400).send({ status: false, message: "InavlidproductId." })
        }

        //finding the product in DB which the user wants to delete.
        const findProduct = await productModel.findById({ _id: params })

        if (!findProduct) {
            return res.status(404).send({ status: false, message: `No book found by ${params}` })
        }
        //Authorizing the user -> if the user doesn't created the book, He/she won't be able to delete it.
        else if (findProduct.userId != req.userId) {
            return res.status(401).send({
                status: false,
                message: "Unauthorized access."
            })
        }
        //if the attribute isDeleted:true , then it is already deleted.
        else if (findProduct.isDeleted == true) {
            return res.status(400).send({ status: false, message: `Product has been already deleted.` })
        } else {
            //if attribute isDeleted:false, then change the isDeleted flag to true, and remove all the reviews of the book as well.
            const deleteData = await productModel.findOneAndUpdate({ _id: { $in: findProduct } }, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true }).select({ _id: 1, title: 1, isDeleted: 1, deletedAt: 1 })
            return res.status(200).send({ status: true, message: "Product deleted successfullly.", data: deleteData })
        }
    } catch (err) {
        return res.status(500).send({ status: false, Error: err.message })
    }
}
module.exports = { createProduct, getProductById, updateProduct, deleteProductById,getProductByFilter }