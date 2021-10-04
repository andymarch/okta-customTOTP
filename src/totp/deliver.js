const middy = require('@middy/core')
const cors = require('@middy/http-cors')
const winston = require("winston")
const totp = require("totp-generator")
const axios = require('axios')

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
    logger.info("Send OTP requested.", { user: payload.userid})

    try {    
        //Retrieve the user profile and extract the totp shared secret from the profile            
        var user = await axios.get(process.env.OKTA_TENANT_URL+'/api/v1/users/'+payload.userid, { headers: {"Authorization" : `SSWS ${process.env.OKTA_API_KEY}`} })
        if(!user.data.profile.totp_shared_secret){
            //User was not enrolled
            logger.error("Unable to process get request", {error: "User profile did not contain secret."})
            return{
                status: 400,
                error: "Unable to perform."
            }
        }

        //Generate the OTP with the secret and algo params
        const token = totp(user.data.profile.totp_shared_secret, {
            digits: 6,
            period: 60,
            algorithm: "SHA-512"
        });

        //Deliver the value to the user by your choice of mechanism
        logger.info(token, { user: payload.userid})
        //do something smarter here
        return {
            statusCode: 200
        }
    }
    catch(error){
        console.error("Unable to process get request",{error: error})
        return{
            status: 500,
            error: "Something failed, sorry."
        }
    }

}

const handler = middy(baseHandler)
.use(cors({
    credentials: true,
    origins: process.env.ORIGINS.split(' ')
}))

module.exports = {handler}