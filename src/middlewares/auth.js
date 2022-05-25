const jwt = require("jsonwebtoken");

//------------------------------------------------------------------------------------------------------------------------------------------------------

const authentication = async function (req, res, next) {
    try {
        // token sent in request header 'authorization'
        let tokenWithBearer = req.headers["authorization"];
        //split values if there is any space between & saved as array form  
        let tokenArray = tokenWithBearer.split(" ");
        //accessing the 2nd postion element by using index[1]
        let token = tokenArray[1];

        // if token is not provided
        if (!token) {
            return res.status(400).send({ status: false, msg: "Token required! Please login to generate token" });
        }

        jwt.verify(token, "Group-33", { ignoreExpiration: true }, function (error, decodedToken) {
            // if token is not valid
            if (error) {
                return res.status(400).send({ status: false, msg: "Token is invalid!" });

                // if token is valid
            } else {
                // checking if token session expired
                if (Date.now() > decodedToken.exp * 1000) {
                    return res.status(401).send({ status: false, msg: "Session Expired" });
                }
                //exposing decoded token userId in request for everywhere access
                req.userId = decodedToken.userId;
                next();

            }
        }
        )

    } catch (err) {
        res.status(500).send({ msg: "Internal Server Error", error: err.message });
    }
};

module.exports = { authentication }