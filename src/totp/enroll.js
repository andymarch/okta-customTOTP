const middy = require('@middy/core')
const cors = require('@middy/http-cors')
const winston = require("winston")
const axios = require('axios')
var base32 = require('hi-base32');
var crypto = require('crypto');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
    ],
});

const baseHandler = async (event) => {
    var payload = JSON.parse(event.body)
    logger.defaultMeta = { requestId: event.requestContext.requestId };
    logger.info("Enroll OTP requested.", { user: payload.userid})
    try { 
        //Get user by login name so we can get the uuid
        var user = await axios.get(process.env.OKTA_TENANT_URL+'/api/v1/users/'+payload.userid, { headers: {"Authorization" : `SSWS ${process.env.OKTA_API_KEY}`} })

        //Generate a secure random seed for the user's OTP
        var seed = crypto.randomBytes(16)
        var encodedSeed = base32.encode(seed)

        //Activate the custom factor
        await axios.post(
            process.env.OKTA_TENANT_URL+'/api/v1/users/'+user.data.id+'/factors?activate=true',
            {
                "factorType": "token:hotp",
                "provider": "CUSTOM",
                "factorProfileId": process.env.OKTA_FACTOR_ID,
                "profile": {
                    "sharedSecret": encodedSeed
                }
            },
            { headers: {"Authorization" : `SSWS ${process.env.OKTA_API_KEY}`} })
        
        //Update the user profile to store the seed
        await axios.post(
                process.env.OKTA_TENANT_URL+'/api/v1/users/'+user.data.id,
                {
                    "profile": {
                        "totp_shared_secret": encodedSeed
                    }
                },
                { headers: {"Authorization" : `SSWS ${process.env.OKTA_API_KEY}`} })
        return {
            statusCode: 200
        }
    }
    catch(error){
        if(error.response && error.response.data){
            console.error("Unable to process request",{error: error})
            console.error("Unable to process request",{error: error.response.data})
            return{
                status: 500,
                error: "Something failed, sorry."
            }
        }
        else{
            console.error("Unable to process request",{error: error})
            return{
                status: 500,
                error: "Something failed, sorry."
            }
        }
    }

}

const handler = middy(baseHandler)
.use(cors({
    credentials: true,
    origins: process.env.ORIGINS.split(' ')
}))

module.exports = {handler}