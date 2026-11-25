import bcrypt from "bcrypt";
import { Secret, SignOptions } from "jsonwebtoken";
import ApiError from "../../../../error/ApiError";
import config from "../../../../config";
import { createToken, verifyToken } from "../../../../helper/jwtHelper";
import generateVerifyCode from "../../../../utilities/codeGenerator";
import { sendVerificationEmail } from "../../../../helper/emailHelper";
import AdminModel from "./Admin.model";

const OTP_TTL_MINUTES = 10;
const RESET_TOKEN_PURPOSE = "admin-password-reset";
const RESET_TOKEN_TTL = "10m";

/** Step 1 — email a 6-digit OTP valid for 10 minutes. */
const adminSendVerifyCodeService = async (payload: { email: string }) => {
  const email = payload.email.trim().toLowerCase();

  const admin = await AdminModel.findOne({ email });
  if (!admin) {
    throw new ApiError(404, "Admin not found to send otp");
  }

  const { code, expiredAt } = generateVerifyCode(OTP_TTL_MINUTES);

  admin.verificationCode = code;
  admin.verificationCodeExpiresAt = new Date(expiredAt);
  await admin.save();

  await sendVerificationEmail(email, { name: admin.name, code });

  return null;
};

/** Step 2 — verify the OTP and hand back a short-lived, single-purpose reset token. */
const adminVerifyCode = async (payload: { email: string; verifyCode: string }) => {
  const email = payload.email.trim().toLowerCase();

  const admin = await AdminModel.findOne({ email });
  if (!admin) {
    throw new ApiError(404, "Admin not found to verify otp");
  }

  if (!admin.verificationCode || payload.verifyCode !== admin.verificationCode) {
    throw new ApiError(400, "Code doesn't match");
  }

  if (admin.verificationCodeExpiresAt && admin.verificationCodeExpiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "Code has expired. Please request a new one.");
  }

  admin.verificationCode = "";
  admin.verificationCodeExpiresAt = null;
  admin.isEmailVerified = true;
  await admin.save();

  const resetToken = createToken(
    { userId: String(admin._id), email: admin.email, purpose: RESET_TOKEN_PURPOSE },
    config.jwt.secret as Secret,
    RESET_TOKEN_TTL as SignOptions["expiresIn"],
  );

  return { resetToken, expiresIn: RESET_TOKEN_TTL };
};

/** Step 3 — public endpoint; only a valid reset token from step 2 can set a new password. */
const adminResetPasswordService = async (payload: { resetToken: string; newPassword: string }) => {
  const decoded = verifyToken(payload.resetToken, config.jwt.secret as Secret);

  if (decoded.purpose !== RESET_TOKEN_PURPOSE || !decoded.userId) {
    throw new ApiError(401, "Invalid reset token");
  }

  const admin = await AdminModel.findById(decoded.userId);
  if (!admin || admin.email !== decoded.email) {
    throw new ApiError(404, "This admin does not exist to reset password");
  }

  if (admin.isBlocked) {
    throw new ApiError(403, "This user is blocked. Cannot reset password");
  }

  admin.password = await bcrypt.hash(payload.newPassword, Number(config.bcrypt.salt_round || 10));
  await admin.save();

  const accessToken: string = createToken(
    { userId: String(admin._id), role: admin.role, email: admin.email },
    config.jwt.secret as Secret,
    config.jwt.expires_in as SignOptions["expiresIn"],
  );

  return {
    user: { name: admin.name, email: admin.email, role: admin.role },
    accessToken,
  };
};

const AdminPasswordRecoveryService = {
  adminSendVerifyCodeService,
  adminVerifyCode,
  adminResetPasswordService,
};

export default AdminPasswordRecoveryService;
