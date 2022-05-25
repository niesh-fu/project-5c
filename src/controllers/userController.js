const userModel = require('../models/userModel')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { isValidRequestBody, isValidAddress, isValid, isValidEmail, isValidPhone, isValidURL, isValidPincode, isValidPassword, isValidObjectId, isValidName } = require('../util/validation')
const { uploadFile } = require('../util/awsConnection')
const bcrypt = require('bcrypt');



const registerUser = async function (req, res) {
    try {

        const files = req.files //Getting user profileImage  
        const requestBody = req.body // Getting other details of user

        // Validation of Request Body
        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request parameter, please provide user Detaills" })
        }

        // Extract body by destructuring
        let { fname, lname, email, phone, password, address } = requestBody;

        //--------------------------------------Validation Starts----------------------------------//

        if (!isValid(fname) || !isValidName(fname)) {
            return res.status(400).send({ status: false, message: "fname is required and it should contain only alphabets" })
        }

        if (!isValid(lname) || !isValidName(lname)) {
            return res.status(400).send({ status: false, message: "lname is required and it should contain only alphabets" })
        }

        if (!isValid(email) || !isValidEmail(email)) {
            return res.status(400).send({ status: false, message: "email is required and it should be a valid email" });
        }
        // Checking E-mail for Uniqueness
        const isEmailAlreadyPresent = await userModel.findOne({ email: email })
        if (isEmailAlreadyPresent) {
            return res.status(400).send({ status: false, message: "Email already present!" });
        }

        // Indian type phone number validation
        if (!isValid(phone) || !isValidPhone(phone)) {
            return res.status(400).send({ status: false, message: "phone is required and it should be a valid indian phone number" });
        }
        // Checking phone number for uniqueness
        const isPhoneAlreadyPresent = await userModel.findOne({ phone: phone })
        if (isPhoneAlreadyPresent) {
            return res.status(400).send({ status: false, message: "Phone number already present!" });
        }

        // Checking the length of password
        if (!isValid(password) || !isValidPassword(password)) {
            return res.status(400).send({ status: false, message: "password is required and it should be Valid min 8 and max 15" })
        }

        //Encrypting Password by Bcrypt package
        const salt = await bcrypt.genSalt(10);
        requestBody.password = await bcrypt.hash(password, salt);

        if (!isValidAddress(address)) {
            return res.status(400).send({ status: false, message: "address is required" });
        }

        const { shipping, billing } = address;

        // shipping address validation
        if (!isValidAddress(shipping)) {
            return res.status(400).send({ status: false, message: "shipping address is required!" });
        }

        if (!isValid(shipping.street)) {
            return res.status(400).send({ status: false, message: "street is required in shipping address!" });
        }

        if (!isValid(shipping.city)) {
            return res.status(400).send({ status: false, message: "city is required in shipping address!" });
        }

        if (!isValidPincode(shipping.pincode)) {
            return res.status(400).send({ status: false, message: "please use a valid pincode in shipping address!" });
        }

        // billing address validation
        if (!isValidAddress(billing)) {
            return res.status(400).send({ status: false, message: "billing address is required!" });
        }

        if (!isValid(billing.street)) {
            return res.status(400).send({ status: false, message: "street is required in billing address!" });
        }

        if (!isValid(billing.city)) {
            return res.status(400).send({ status: false, message: "city is required in billing address!" });
        }

        if (!isValidPincode(billing.pincode)) {
            return res.status(400).send({ status: false, message: "please use a valid pincode in billing address!" });
        }

        //if request files array is empty
        if (!(files && files.length > 0)) {
            return res.status(400).send({ status: false, message: "image is required" });
        }

        //--------------------------------------Validation Ends----------------------------------//

        requestBody.profileImage = await uploadFile(files[0]);  //profileImage uploaded to AWS S3 Bucket

        const createdUser = await userModel.create(requestBody)
        res.status(201).send({ status: true, message: 'User created successfully', data: createdUser })


    } catch (err) {
        res.status(500).send({ status: false, msg: err.message })
    }

}

//==============================================================================================================================

module.exports = { registerUser }