const productModel = require('../models/productModel');
const { isValidRequestBody, isValid, isValidName, isValidPrice } = require('../util/validation')
const { uploadFile } = require('../util/awsConnection')

const createProduct = async function (req, res) {

    try {

        const files = req.file; //Getting productImage
        const requestBody = JSON.parse(JSON.stringify(req.body)); // Getting details of product

        // Validation of Request Body
        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request parameter, please provide product Details" })
        }

        // Extract body by destructuring
        let { title, description, price, currencyId, isFreeShipping, style, availableSizes, installments } = requestBody;


        if (!isValid(title) || !isValidName(title)) {
            return res.status(400).send({ status: false, message: "title is required and it should contain only alphabets" })
        }

        // Checking title for uniqueness
        const isTitleAlreadyPresent = await productModel.findOne({ title: title })
        if (isTitleAlreadyPresent) {
            return res.status(400).send({ status: false, message: `${title} is already used by another product!` });
        }

        if (!isValid(title) || !isValidName(title)) {
            return res.status(400).send({ status: false, message: "title is required and it should contain only alphabets" })
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

        if (requestBody.hasOwnProperty('isFreeShipping')) {
            if (!(isFreeShipping === true || isFreeShipping === false)) {
                return res.status(400).send({ status: false, message: "isFreeShipping should have only true/false in it" });
            }
        }

        if (requestBody.hasOwnProperty('style')) {
            if (!isValid(style)) {
                return res.status(400).send({ status: false, message: "style should be valid" });
            }
        }

        if (!isValid(availableSizes)) {
            return res.status(400).send({ status: false, message: "product available sizes are required" });
        }


        console.log(availableSizes)
        if (Array.isArray(availableSizes) || availableSizes.length === 0) {
            return res.status(400).send({ status: false, message: `enter size in valid format like :- [S,M,L]` });
        }

        for (let i = 0; i < availableSizes.length; i++) {
            let size = availableSizes[i];
            if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size))) {
                return res.status(400).send({ status: false, message: `availableSizes should be among ["S", "XS", "M", "X", "L", "XXL", "XL"]` })
            }
        }

        if (requestBody.hasOwnProperty('installments')) {
            if (installments <= 0 || installments % 1 != 0) {
                return res.status(400).send({ status: false, message: "installments can not be a decimal number " })
            }
        }

        if (!(files && files.length > 0)) {
            return res.status(400).send({ status: false, message: "Please provide product image" })
        }

        requestBody.productImage = await uploadFile(files[0])
        requestBody.currencyFormat = '₹';

        const createdProduct = await productModel.create(requestBody)
        return res.status(201).send({ status: true, message: "new product created successfully", data: createdProduct });

    } catch (err) {
        res.status(500).send({ status: false, msg: err.message })
    }
}

//========================================================================================================================================

const getProductById = async function (req, res) {
    try {

        const productId = req.params.productId;
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Please provide valid productId" })

        const productDetails = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!productDetails) return res.status(404).send({ status: false, message: "No such product exists" })

        return res.status(200).send({ status: true, message: 'Success', data: productDetails })

    } catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
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

        // if(!productImage.length==0){
        //     return res.status(400).send({ status: false, message: 'No paramateres passed product unmodified' })
        // }



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
        /*  if (isValid(availableSizes)) {
              let arr = availableSizes.split(",").map(x => x.trim())
              for (let i = 0; i < arr.length; i++) {
                  if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(arr[i]))) {
                      return res.status(400).send({ status: false, msg: 'availableSizes should be among ["S", "XS", "M", "X", "L", "XXL", "XL"]' })
                  }
              }
              let data = await productModel.findOne({ _id: productId }).select({ availableSizes: 1 })
              let sizes = data.availableSizes
              let newArr = [...arr, ...sizes] 
            
                  if (!updatedProductData.hasOwnProperty['availableSizes']) {
                      updatedProductData['availableSizes'] = newArr
                  }
              
          }*/
        if (validator.isValid(installments)) {
            if (!(!isNaN(Number(installments)))) {
                return res.status(400).send({ status: false, message: `Installments should be a valid number` })
            }
            if (!updatedProductData.hasOwnProperty['installments']) {
                updatedProductData['installments'] = installments
            }
        }


        if (productImage && !productImage.length == 0) {   //Undefined.length will not work in JS
            if (!validator.isValidRequestBody(productImage)) {
                return res.status(400).send({ status: false, msg: "Invalid request parameters. Provide productImage." });
            }
            const downloadUrl = await awsFile.uploadFile(productImage[0]);
            if (!updatedProductData.hasOwnProperty['productImage']) {
                updatedProductData['productImage'] = downloadUrl
            }
        }
        const updatedProduct = await productModel.findOneAndUpdate({ _id: productId }, updatedProductData, { new: true })
        return res.status(200).send({ status: true, message: 'Successfully updated', data: updatedProduct });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//================================================================================================================================================

const deleteProductById = async function (req, res) {
    try {
        const productId = req.params.productId
        const product = await productModel.findOne({ _id: productId, isDeleted: false })
        await productModel.findOneAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: new Date() } })
        return res.status(200).send({ status: true, message: 'Successfully deleted' })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

module.exports = { createProduct, getProductById, updateProduct, deleteProductById }