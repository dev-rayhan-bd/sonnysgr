import ApiError from "../error/ApiError";
import sendEmail from "./sendEmail";
// import resetPassEmailTemp from "../mailTemplate/resetPassEmailTemp";
import verifyEmailTemp from "../mailTemplate/verifyEmailTemp";
import { TEmailTemplate } from "../interface/email.interface";
// import supportEmailTemp from "../mailTemplate/supportEmailTemp";



export const sendVerificationEmail = async (email: string, data: any) => {
  try {
    await sendEmail({
      email,
      subject: "Verify your email - health vault Security Code",
      html: verifyEmailTemp(data),
    });
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Email was not sent");
  }
};

// export const sendResetPasswordEmail = async (email, data) => {
//   try {
//     await sendEmail({
//       email,
//       subject: "Reset password code - PBFS Security Code",
//       html: resetPassEmailTemp(data),
//     });
//   } catch (error) {
//     console.log(error);
//     throw new ApiError(500, "Email was not sent");
//   }
// };

// export const sendSupportEmailToAdmin = async (email,subject,body) => {
//   try {
//     await sendEmail({
//       email,
//       subject: subject,
//       html: supportEmailTemp(body),
//     });
//   } catch (error) {
//     console.log(error);
//     throw new ApiError(500, "Email was not sent");
//   }
// };