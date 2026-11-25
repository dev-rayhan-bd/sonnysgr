import { z } from "zod";

/** Dashboard permission keys a Super_Admin can grant to an Admin. */
export const ADMIN_PERMISSIONS = [
  "users",
  "stores",
  "resellers",
  "finance",
  "disputes",
  "support",
  "moderation",
  "analytics",
  "notifications",
] as const;

export const createAdminvalidation = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email required"),
    phone: z.string().min(5, "Phone Number is required").optional(),
    password: z.string().min(5, "Password is required"),
    address: z.string().min(1, "Address is required").optional(),
    contact: z.string().min(5, "Contact no. is required").optional(),
    role: z.enum(["Admin", "Super_Admin"]).optional(),
    permissions: z.array(z.enum(ADMIN_PERMISSIONS)).optional(),
  }),
});

export const adminResetPasswordValidation = z.object({
  body: z
    .object({
      resetToken: z.string().min(1, "resetToken from /admin-verify-code is required"),
      newPassword: z.string().min(6, "New password must be at least 6 characters"),
      confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Password and confirm password must match",
      path: ["confirmPassword"],
    }),
});

export const adminIdParamValidation = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid admin id") }),
});

export const editProfilevalidation = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").optional(),
    address: z.string().min(1, "Address is required").optional(),
    phone: z.string().min(5, "Phone Number is required").optional(),
    contact: z.string().min(5, "Contact no. is required").optional(),
  }),
});

export const adminLoginValidation = z.object({
  body: z.object({
    email: z.string().email().min(1, "Valid email required"),
    password: z.string().min(5, "password is required"),
  }),
});

export const changeAdminPasswordValidation = z.object({
  body: z
    .object({
      oldPassword: z
        .string()
        .min(4, "Old password must be at least 5 characters"),
      newPassword: z
        .string()
        .min(4, "New password must be at least 5 characters"),
      confirmPassword: z
        .string()
        .min(4, "Confirm password must be at least 5 characters"),
    })
    // validate that password === confirmPassword
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Password and confirm password must match",
      path: ["confirmPassword"],
    }),
});
