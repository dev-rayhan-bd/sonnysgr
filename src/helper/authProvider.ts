import appleSigninAuth from "apple-signin-auth";
import { OAuth2Client } from "google-auth-library";
import config from "../config";

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);


//google auth token verification
export const verifyGoogleToken = async (idToken: string) => {

    const ticket = await client.verifyIdToken({
        idToken,
        audience: config.auth.google_client_id!
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new Error("Invalid Google token.");
    }

    return {
        email: payload.email,
        emailVerified: payload.email_verified,
        providerId: payload.sub,
        name: payload.name,
        picture: payload.picture
    };
};


//apple auth token verification
export const verifyAppleToken = async (identityToken: string) => {

    const payload = await appleSigninAuth.verifyIdToken(

            identityToken,
            {
                audience: config.auth.apple_bundle_id!
            }
        );

    return {
        providerId: payload.sub,
        email: payload.email
    };
};