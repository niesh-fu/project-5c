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

        if (isNaN(price) || price <= 0 || !isValidPrice(price)) {
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

        const productImage = await uploadFile(files[0]);

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

        let { size, name, priceGreaterThan, priceLessThan, priceSort } = query;


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

            if (query.hasOwnProperty("priceGreaterThan")) {
                filters["price"] = { $gt: Number(priceGreaterThan), $lt: Number(priceLessThan) };
            }
            else {
                filters["price"] = { $lt: Number(priceLessThan) };
            }
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

        const requestBody = JSON.parse(JSON.stringify(req.body));
        const productId = req.params.productId;
        

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Invalid productId in params." })
        }

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'No paramateres passed product unmodified' })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!product) {
            return res.status(404).send({ status: false, message: 'Product is not found' })
        }

        const { title, description, price, currencyId, isFreeShipping, style, availableSizes, installments } = requestBody;

        let updatedProductData = {};

        if (requestBody.hasOwnProperty('title')) {
            if (!isValid(title)) {
                return res.status(400).send({ status: false, message: "title should be a valid" })
            }

            const isTitleAlreadyUsed = await productModel.findOne({ title: title });
            if (isTitleAlreadyUsed) {
                return res.status(400).send({ status: false, message: `${title} title is already used` })
            }
            updatedProductData['title'] = title;
        }


        if (requestBody.hasOwnProperty('description')) {
            if (!isValid(description)) {
                return res.status(400).send({ status: false, message: "description should be a valid" })
            }
            updatedProductData['description'] = description
        }


        if (requestBody.hasOwnProperty('price')) {
            if (isNaN(price) || price <= 0 || !isValidPrice(price)) {
                return res.status(400).send({ status: false, message: "price should be valid and ZERO not acceptable" })
            }
            updatedProductData['price'] = price
        }


        if (requestBody.hasOwnProperty('currencyId')) {
            if (!isValid(currencyId) || currencyId != 'INR') {
                return res.status(400).send({ status: false, message: 'currencyId should be INR only' })
            }
            updatedProductData['currencyId'] = currencyId
        }


        if (requestBody.hasOwnProperty('isFreeShipping')) {
            if (!((isFreeShipping === "true") || (isFreeShipping === "false"))) {
                return res.status(400).send({ status: false, message: 'isFreeShipping should be true or false' })
            }
            updatedProductData['isFreeShipping'] = isFreeShipping
        }


        if (requestBody.hasOwnProperty('style')) {
            if (!isValid(style)) {
                return res.status(400).send({ status: false, message: "style should be valid" });
            }
            updatedProductData['style'] = style
        }


        if (requestBody.hasOwnProperty('installments')) {
            if (installments <= 0 || installments % 1 != 0) {
                return res.status(400).send({ status: false, message: "installments can not be a decimal number " })
            }
            updatedProductData['installments'] = installments
        }


        if (requestBody.hasOwnProperty('availableSizes')) {
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

            updatedProductData['availableSizes'] = AVAILABLE_SIZES
        }

        const files = req.files;
        if ((files && files.length > 0)) {   //Undefined.length will not work in JS
            const productImage = await uploadFile(files[0]);
            updatedProductData['productImage'] = productImage
        }


        const updatedProduct = await productModel.findOneAndUpdate({ _id: productId }, updatedProductData, { new: true })
        res.status(200).send({ status: true, message: 'Successfully updated', data: updatedProduct });

    } catch (err) {
        return res.status(500).send({ status: false, msg: err.message });
    }
}

//================================================================================================================================================

const deleteProductById = async function (req, res) {
    try {

        const productId = req.params.productId; //accessing theproductId from the params.

        //validation for the invalid params.
        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Inavlid productId." })
        }

        //finding the product in DB which the user wants to delete.
        const findProduct = await productModel.findById(productId);
        if (!findProduct) {
            return res.status(404).send({ status: false, message: `No book found by ${productId}` })
        }

        //if the attribute isDeleted:true , then it is already deleted.
        if (findProduct.isDeleted == true) {
            return res.status(400).send({ status: false, message: `Product has been already deleted.` })
        }

        //if attribute isDeleted:false, then change the isDeleted flag to true, and remove all the reviews of the book as well.
        const deletedProduct = await productModel.findOneAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true }).select({ _id: 1, title: 1, isDeleted: 1, deletedAt: 1 })
        res.status(200).send({ status: true, message: "Product deleted successfullly.", data: deletedProduct })

    } catch (err) {
        return res.status(500).send({ status: false, Error: err.message })
    }
}
module.exports = { createProduct, getProductById, updateProduct, deleteProductById, getProductByFilter }