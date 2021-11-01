/* Este arquivo ira ficar responsavel por fazer a comunicação com o AWS da Amazon, 
   e ira armazenar nossos arquivos que iremos fazer o upload.
*/

const AWS = require('aws-sdk');

require('dotenv').config();
const IAM_USER_KEY = process.env.IAM_USER_KEY;
const IAM_USER_SECRET = process.env.IAM_USER_SECRET;
const BUCKET_NAME = process.env.BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;

module.exports = {
    IAM_USER_KEY,
    IAM_USER_SECRET,
    BUCKET_NAME,
    AWS_REGION,

    uploadToS3: function (file, filename, acl = 'public-read') {
        return new Promise( (resolve, reject) => {
            let IAM_USER_KEY = this.IAM_USER_KEY;
            let IAM_USER_SECRET = this.IAM_USER_SECRET;
            let BUCKET_NAME = this.BUCKET_NAME;
            
            
            // Pré-conexao com o aws
            let s3bucket = new AWS.S3({
                accessKeyId: IAM_USER_KEY,
                secretAccessKey: IAM_USER_SECRET,
                Bucket: BUCKET_NAME
            });

            // Conexão de fato com o aws
            s3bucket.createBucket( function () {
                var params = {
                    Bucket: BUCKET_NAME,
                    Key: filename,
                    Body: file.data,
                    ACL: acl,
                };
            



                s3bucket.upload(params, function(err, data) {
                    if(err) {
                        console.log(err);
                        return resolve({ error: true, message: err.message });
                    }
                    console.log(data);
                    return resolve({ error: false, message: data }); 
                });

            });
        });
    },  

    deleteFileS3: function(key) {
        return new Promise((resolve, reject) => {
            let IAM_USER_KEY = this.IAM_USER_KEY;
            let IAM_USER_SECRET = this.IAM_USER_SECRET;
            let BUCKET_NAME = this.BUCKET_NAME;
        

            let s3bucket = new AWS.S3({
                accessKeyId: IAM_USER_KEY,
                secretAccessKey: IAM_USER_SECRET,
                Bucket: BUCKET_NAME
            });

            s3bucket.createBucket( function () {
                s3bucket.deleteObject(
                    {
                        Bucket: BUCKET_NAME,
                        Key: key
                    },

                    function(err, data) {
                        if(err) {
                            console.log(err);
                            return resolve({ error: true, message: err });
                        }
                        console.log(data);
                        return resolve({ error: false, message: data });
                    }
                );
            });

        });
    }


}