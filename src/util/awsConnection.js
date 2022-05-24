const AWS = require("aws-sdk")


AWS.config.update({
    accessKeyId: "AKIAY3L35MCRUJ6WPO6J",
    secretAccessKey: "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",
    region: "ap-south-1"
})

const uploadFile = async function ( file) {

   return new Promise( function(resolve, reject) {

    // this function will upload file to aws and return the link
    const s3= new AWS.S3({apiVersion: '2006-03-01'}); // we will be using the s3 service of aws

    const uploadParams= {
        ACL: "public-read",
        Bucket: "classroom-training-bucket",  
        Key: "Group-33/" + file.originalname,  
        Body: file.buffer
    }


    s3.upload( uploadParams, function (err, data ){
        if(err) {
            return reject({"error": err})
        }
        console.log(data)
        console.log("file uploaded succesfully")
        return resolve(data.Location)
    })


   })
}


module.exports = {uploadFile}