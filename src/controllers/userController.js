const userModel = require('../models/userModel')
const jwt = require('jsonwebtoken')
const { isValidRequestBody, isValidAddress, isValid, isValidEmail, isValidPhone, isValidURL, isValidPincode, isValidPassword, isValidObjectId, isValidName } = require('../util/validation')
const { uploadFile } = require('../util/awsConnection')
const bcrypt = require('bcrypt');

//==============================================================================================================================

const registerUser = async function (req, res) {
    try {

        const files = req.files //Getting user profileImage  
        const requestBody = req.body // Getting other details of user

        // Validation of Request Body
        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request parameter, please provide user Details" })
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
            return res.status(400).send({ status: false, message: "Profile image is required in files" });
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

const loginUser = async function (req, res) {
    try {

        const requestBody = req.body; //Getting E-Mail and Password from request Body
        // Request Body validation
        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Please enter login credentials" });
        }

        // Destructuring request body
        const { email, password } = requestBody;

        if (!isValid(email) || !isValidEmail(email)) {
            return res.status(400).send({ status: false, message: "Email is requird and it should be a valid email address" });
        }

        if (!isValid(password) || !isValidPassword(password)) {
            return res.status(400).send({ status: false, message: "Password is requird and it should be Valid min 8 and max 15 length" });
        }

        // Find user details from DB 
        const user = await userModel.findOne({ email: email });

        // Checking User exists or not
        if (!user) {
            return res.status(401).send({ status: false, message: "The email address you entered isn't connected to an account. Register a new user first." });
        }

        //Decrypt password by Bcrypt and Compare the password with password from request body
        const decrypPassword = user.password
        const pass = await bcrypt.compare(password, decrypPassword)
        if (!pass) {
            return res.status(400).send({ status: false, message: "Password Incorrect" })
        }

        // JWT token creation for authentication of other APIs
        const token = await jwt.sign({ userId: user._id }, 'Group-33', { expiresIn: "24h" })

        // Sending token in response header
        res.setHeader('Authorization', 'Bearer ' + token);
        res.status(201).send({ status: true, msg: "successful login", data: { userId: user._id, token: token } });

    } catch (error) {
        res.status(500).send({ status: false, msg: error.message });
    }
}

//==============================================================================================================================

const getUserProfile = async function (req, res) {
    try {
        const userId = req.params.userId;

        //checking valid userId
        if (!isValid(userId) || !isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Please Provide valid userId" })
        }

        //compare decodedToken-[req.userId] with params userId
        if (userId != req.userId) {
            return res.status(403).send({ status: false, message: "unauthorized access!" });
        }

        const userDetails = await userModel.findById({ _id: userId })
        if (!userDetails) {
            return res.status(404).send({ status: false, message: "No such User Exists" })
        }

        res.status(200).send({ status: true, message: "User profile details", data: userDetails })
    } catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
    }
}

//==============================================================================================================================

const updateUserProfile = async function (req, res) {
    try {
        // userId sent through path params
        const userId = req.params.userId;

        //if userId is not valid ObjectId
        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "userId is not valid!" });
        }
        //cheking user details in database
        const isUserPresent = await userModel.findById(userId);
        if (!isUserPresent) {
            return res.status(404).send({ status: false, message: "user not found!" });
        }

        //compare decodedToken-[req.userId] with params userId
        if (userId != req.userId) {
            return res.status(403).send({ status: false, message: "unauthorized access!" });
        }

        // user details (to be updated) sent through request body
        const bodyFromReq = JSON.parse(JSON.stringify(req.body));

        // if request body is empty
        if (!isValidRequestBody(bodyFromReq)) {
            return res.status(400).send({ status: false, message: "Please provide user details to update!" });
        }
        // declaring a new emapty object to holds the all values in it
        let upadteFields = {};

        // files send through form in req.files
        const files = req.files;
        // if there is any file it will be update
        if (files && files.length > 0) {
            upadteFields["profileImage"] = await uploadFile(files[0]);
        }

        // update fields sent through request body
        const { fname, lname, email, phone, password, address } = bodyFromReq;

        //--------------------------------------Validation Starts----------------------------------//

        // if fname is present in req checking through hasOwnProperty
        if (bodyFromReq.hasOwnProperty("fname")) {
            // if fname is empty
            if (!isValid(fname) || !isValidName(fname)) {
                return res.status(400).send({ status: false, message: "fname should contain only alphabets" })
            }

            upadteFields["fname"] = fname;
        }

        // if lname is present in req checking through hasOwnProperty
        if (bodyFromReq.hasOwnProperty("lname")) {
            // if lname is empty
            if (!isValid(lname) || !isValidName(lname)) {
                return res.status(400).send({ status: false, message: "lname should contain only alphabets" })
            }

            upadteFields["lname"] = lname;
        }

        // if email is present in req checking through hasOwnProperty
        if (bodyFromReq.hasOwnProperty("email")) {
            // if email is empty
            if (!isValid(email) || !isValidEmail(email)) {
                return res.status(400).send({ status: false, message: "email should be a valid email" });
            }

            // Checking E-mail for Uniqueness
            const isEmailAlreadyPresent = await userModel.findOne({ email: email })
            if (isEmailAlreadyPresent) {
                return res.status(400).send({ status: false, message: "Email already present!" });
            }

            upadteFields["email"] = email;
        }

        // if phone is present in req checking through hasOwnProperty
        if (bodyFromReq.hasOwnProperty("phone")) {
            // Indian type phone number validation
            if (!isValid(phone) || !isValidPhone(phone)) {
                return res.status(400).send({ status: false, message: "phone should be a valid indian phone number" });
            }

            // Checking phone number for uniqueness
            const isPhoneAlreadyPresent = await userModel.findOne({ phone: phone })
            if (isPhoneAlreadyPresent) {
                return res.status(400).send({ status: false, message: "Phone number already present!" });
            }

            upadteFields["phone"] = phone;
        }

        // if password is present in req checking through hasOwnProperty
        if (bodyFromReq.hasOwnProperty("password")) {
            // Checking the length of password
            if (!isValid(password) || !isValidPassword(password)) {
                return res.status(400).send({ status: false, message: "password should be Valid min 8 and max 15" })
            }

            // if old password is same as new password
            const isSamePassword = await bcrypt.compare(password, isUserPresent.password);
            if (isSamePassword) {
                return res.status(400).send({ status: false, message: "password is same as old password" })
            }

            //Encrypting Password by Bcrypt package
            const salt = await bcrypt.genSalt(10);
            const newPassword = await bcrypt.hash(password, salt);

            upadteFields["password"] = newPassword;
        }


        if (bodyFromReq.hasOwnProperty('address')) {

            const { shipping, billing } = address;

            if (address.hasOwnProperty('shipping')) {

                const { street, city, pincode } = shipping;
                // shipping address validation
                if (shipping.hasOwnProperty('street')) {
                    if (!isValid(street)) {
                        return res.status(400).send({ status: false, message: "street is not valid in shipping" });
                    }

                    upadteFields["address.shipping.street"] = street;
                }

                if (shipping.hasOwnProperty('city')) {
                    if (!isValid(city)) {
                        return res.status(400).send({ status: false, message: "city is not valid in shipping" });
                    }

                    upadteFields["address.shipping.city"] = city;
                }

                if (shipping.hasOwnProperty('pincode')) {
                    if (!isValidPincode(pincode)) {
                        return res.status(400).send({ status: false, message: "please use a valid pincode in shipping address!" });
                    }

                    upadteFields["address.shipping.pincode"] = pincode;
                }
            }



            if (address.hasOwnProperty('billing')) {

                const { street, city, pincode } = billing;
                // shipping address validation
                if (billing.hasOwnProperty('street')) {
                    if (!isValid(street)) {
                        return res.status(400).send({ status: false, message: "street is not valid in billing" });
                    }

                    upadteFields["address.billing.street"] = street;
                }

                if (billing.hasOwnProperty('city')) {
                    if (!isValid(city)) {
                        return res.status(400).send({ status: false, message: "city is not valid in billing" });
                    }

                    upadteFields["address.billing.city"] = city;
                }

                if (billing.hasOwnProperty('pincode')) {
                    if (!isValidPincode(pincode)) {
                        return res.status(400).send({ status: false, message: "please use a valid pincode in billing address!" });
                    }

                    upadteFields["address.billing.pincode"] = pincode;
                }
            }

        }

        //--------------------------------------Validation Ends----------------------------------//

        //updating user details
        const updatedUserProfile = await userModel.findOneAndUpdate({ _id: userId }, { $set: upadteFields }, { new: true });

        res.status(200).send({ status: true, message: "User profile updated", data: updatedUserProfile });
    } catch (error) {
        return res.status(500).send({ status: false, Error: error.message })
    }
}

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile }