const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({


    fname: {
        type: String,
        required: true,
        trim: true
    },
    lname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    profileImage: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        length: 10,
        unique: true
    },
    password: {
        type: String,
        require: true,
        trim: true
    },

    address: {
        shipping: {
            street: {
                type: String,
                required: true,
                trim: true
            },
            city: {
                type: String,
                required: true,
                trim: true
            },
            pincode: {
                type: Number,
                required: true
            }
        },
        billing: {
            street: {
                type: String,
                required: true,
                trim: true
            },
            city: {
                type: String,
                required: true,
                trim: true
            },
            pincode: {
                type: Number,
                required: true
            }
        }
    }


}, { timestamps: true })

module.exports = mongoose.model('user', userSchema);