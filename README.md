# Okta Custom TOTP

This sample demonstrates the required functions to provide custom TOTP delivery
with Okta. This builds on the work done by James Reeder.

## Pre-requisties

- [Read the documentation](https://help.okta.com/en/prod/Content/Topics/Security/mfa-totp-seed.htm)
- Enable the Custom OTP feature on your Okta tenant
- Add a TOTP factor with the following options:  6 digit length, HMacSHA512, 60
  second time step, clock drift interval of 3 and Base32 secret encoding.
- Create an enrollment policy which makes your factor available.
- Create an authentication policy which prompts the user for the custom OTP factor.
- Using the profile editor add an attribute called 'totp_shared_secret', this
  should be marked as sensitive in a production setting.

- Configure serverless so this demonstation can be deployed.

## Setup 

- Create a config.dev.json file in the root of the project with the following
  structure

   ```
   {
    "origins":"https://trustedsite1.com https://trustedsite2.com",
    "okta_tenant": "https://yourtenant.okta.com",
    "okta_api_key": "an okta API scope scoped to read and write users",
    "okta_factor_id": "the id of your custom otp factor"
    }
   ```

- Deploy with ```sls deploy``` and note the two endpoints given.
- Load the Postman collection in this project and set the environment variable
  so endpoint is the sls endpoint (before the stage indicator) and the login is
  the login name of the user you wish to test with.

## Testing
- Send the "enroll OTP" request, you should recieve 200 response, see the user
  has enrolled the factor on Okta and has a value in the totp_shared_secret
  field of their profile.
- Begin logging the user in using the Okta hosted page to test. When prompted for OTP send the "Deliver OTP"
  request, you should recieve a 200 response and the OTP value will be written to
  the cloudwatch log for the lamdba as shown below where the code is 130114.
  Submit this in the authentication prompt to continue.

  ```
  2021-10-04T21:11:31.213+01:00 {"level":"info","message":"130114","requestId":"18f9dd72-d985-4d1a-9cc9-85faae87f7d6","user":"test@test.com"} 
  ```

## Extending and implementing

This demonstration simply writes the value to the cloudwatch log. Alter the
deliver lambda as required to send the OTP value to any desired delivery
mechanism of your choice.

When you have sufficient user information to deliver your OTP your logic should
call the enroll endpoint.

The custom OTP will then be returned as an authentication factor by the Okta
Authentication policy both via the SignIn Widget and the API. When the user
selects to be authenticated by custom OTP the deliver endpoint should be called
to trigger your delivery mechanism. The sign in widget can be customised to
trigger this automatically when the custom provider is selected.