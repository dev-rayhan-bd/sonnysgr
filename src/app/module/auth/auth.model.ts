import { model, models, Schema } from "mongoose";
import bcrypt from "bcrypt";
import config from "../../../config";
import { IAuth } from "./auth.interface";
import { ENUM_AUTH_PROVIDER_TYPE, ENUM_USER_Type } from "../../../utilities/enum";


const AuthSchema = new Schema<IAuth>({
    profile: { type: Schema.Types.ObjectId,  refPath: "refModel"  },
    refModel: { type: String, required: true },
    // name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    authProviders: [{
        provider: {
            type: String,
            enum: Object.values(ENUM_AUTH_PROVIDER_TYPE),
            required: true
        },

        providerId: {
            type: String,
            required: true
        }
    }],
    role: { type: String, required: true , enum: Object.values(ENUM_USER_Type)},
    verificationCode: { type: String, default: "" },
    isEmailVerified: { type: Boolean, default: false },
    isResetPaswordEmailVerified: { type: Boolean, default: false },
    isProfileCompleted: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

// UserSchema.pre('save', async function (next) {
//     // eslint-disable-next-line @typescript-eslint/no-this-alias
//     const user = this;
//     if (user.password) {
//         user.password = await bcrypt.hash(
//             user.password,
//             Number(config.bcrypt.salt_round)
//         );
//     }
//     next();
// });

// UserSchema.post('save', function (doc, next) {
//     doc.password = '';
//     next();
// });

// // statics method for check is user exists
// UserSchema.statics.isUserExists = async function (phoneNumber: string) {
//     return await UserModel.findOne({ phoneNumber }).select('+password');
// };

// // statics method for check password match  ----
// UserSchema.statics.isPasswordMatched = async function (
//     plainPasswords: string,
//     hashPassword: string
// ) {
//     return await bcrypt.compare(plainPasswords, hashPassword);
// };

// UserSchema.statics.isJWTIssuedBeforePasswordChange = async function (
//     passwordChangeTimeStamp,
//     jwtIssuedTimeStamp
// ) {
//     const passwordChangeTime =
//         new Date(passwordChangeTimeStamp).getTime() / 1000;

//     return passwordChangeTime > jwtIssuedTimeStamp;
// };

const AuthModel = models.Auth || model<IAuth>("Auth", AuthSchema);

export default AuthModel;