const {  isValid, isValidObjectId,isValidRequestBody } = require('../util/validation')

const orderModel = require('../models/orderModel')
const productModel = require('../models/productModel')
const cartModel = require('../models/cartModel')
const userModel = require('../models/userModel')

const createOrder = async function (req, res) {
    try {
        let userId =  req.params.userId
        let requestBody = JSON.parse(JSON.stringify(req.body));
        let userIdFromToken = req.userId

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request parameter, please provide order Details" })
        }

        if (!isValid(userId)) {
            return res.status(400).send({status: false,message: "Invalid request parameters. userId is required"});
        }
        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. userId is not valid" });
        }
       

        let usercartid = await userModel.findOne({ _id: userId });
        if (!usercartid) {
            return res.status(400).send({ status: false, msg: "No such user found. Please register and try again" });
        }
        if (usercartid._id.toString() !== userIdFromToken) {
            res.status(401).send({ status: false, message: `Unauthorized access! Owner info doesn't match` });
            return
        }


        let existCart = await cartModel.findOne({ userId: userId })

        if (!existCart) {
            return res.status(400).send({ status: false, msg: "No cart found for respective user" });
        }


        const { items, totalPrice, totalItems } = existCart

        if (totalItems == 0) {
            return res.status(202).send({ status: false, msg: "Order Alredy placed from this cart Or cart is empty" });
        }

        let totalQuantity = items.map(x => x.quantity).reduce((a, b) => a + b);
        let obj = {
            userId: userId,
            items: items,
            totalPrice: totalPrice,
            totalItems: totalItems,
            totalQuantity: totalQuantity

        }

        if (requestBody.hasOwnProperty('cancellable')) {
            if (!((requestBody.cancellable === "true") || (requestBody.cancellable === "false"))) {
                return res.status(400).send({ status: false, message: "cancellable should have only true/false in it" });
            }
            obj['cancellable'] = requestBody.cancellable
        }

        let orders = await orderModel.create(obj)

        await cartModel.findOneAndUpdate({ userId: userId }, { items: [], totalPrice: 0, totalItems: 0 })

        res.status(200).send({ status: true, msg: 'order created successfully', data: orders })

    } catch (err) {
        res.status(500).send({ status: false, msg: err.message })
    }
}

//!--------- update

const updateOrder = async function (req, res) {
    try {
        let userId = req.params.userId;
        let requestBody = req.body;
        let userIdFromToken = req.userId
        
        if (!isValid(userId)) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. userId is required" });
        }
        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. userId is not valid" });
        }

       

        let usercartid = await userModel.findOne({ _id: userId });
        if (!usercartid) {
            return res.status(400).send({ status: false, msg: "No such user found. Please register and try again" });
        }
        
        if (usercartid._id.toString() !== userIdFromToken) {
            res.status(401).send({ status: false, message: `Unauthorized access! Owner info doesn't match` });
            return
        }

        let { orderId, status } = requestBody;

        if (!isValid(orderId)) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. orderId is required" });
        }
        if (!isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. orderId is not valid" });
        }
        let orderCartid = await orderModel.findById({ _id: orderId });
      
        if (!orderCartid) {
            return res.status(400).send({ status: false, msg: "No such order found. Please register and try again" });
        }
        if (!isValid(status)) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. status is required" });
        }
        if (!((status === 'pending') || (status === 'completed') || (status === 'cancelled'))) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. status can only be ['pending', 'completed', 'cancelled']" });
        }

        // if true :
        // pending => completed
        // pending => cancelled
        // completed => error message
        // cancelled => error message
        // if false
        // pending => completed
        // completed => error mesaage
        // cancelled => error message
        //console.log(orderCartid.cancellable)

        if (orderCartid.cancellable === true) {
            if (orderCartid.status === 'pending') {
                if (status === 'completed') {
                    let updatedOrder = await orderModel.findOneAndUpdate({ orderId: orderId }, { status: 'completed' }, { new: true })
                    return res.status(200).send({ status: true, msg: 'order status completed ', data: updatedOrder })
                }
                if (status === 'cancelled') {
                    let updatedOrder = await orderModel.findOneAndUpdate({ orderId: orderId }, { status: 'cancelled' }, { new: true })
                    return res.status(200).send({ status: true, msg: 'order status cancelled', data: updatedOrder })
                }

            }
            if (orderCartid.status === 'completed') {
                if (status === 'pending' || status === 'completed' || status === 'cancelled') {
                    return res.status(400).send({ status: false, msg: ' 1 Order status cant be changed  ' })
                }
            }
            if (orderCartid.status === 'cancelled') {
                if (status === 'pending' || status === 'completed' || status === 'cancelled') {
                    return res.status(400).send({ status: false, msg: ' 2 Order status cant be changed ' })
                }
            }

        }

        if (orderCartid.cancellable == false) {
        
            if (orderCartid.status === 'pending') {
                if (status === 'completed') {
                    let updatedOrder = await orderModel.findOneAndUpdate({ orderId: orderId }, { status: 'completed' }, { new: true })
                    return res.status(200).send({ status: true, msg: 'order status completed ', data: updatedOrder })
                }
            }
          
            if (orderCartid.status === 'completed') {
                if (status === 'pending' || status === 'completed' || status === 'cancelled') {
                    return res.status(400).send({ status: false, msg: ' 3 Order status cant be changed  ' })
                }
            }
            if (orderCartid.status === 'cancelled') {
                if (status === 'pending' || status === 'completed' || status === 'cancelled') {
                    return res.status(400).send({ status: false, msg: ' 4 Order status cant be changed  ' })
                }
            }
        }

        return res.status(400).send({ status: false, msg: 'Order unchanged ' })



    } catch (err) {
        res.status(500).send({ status: false, msg: err.message })
    }
}
module.exports = {
    createOrder, updateOrder
}