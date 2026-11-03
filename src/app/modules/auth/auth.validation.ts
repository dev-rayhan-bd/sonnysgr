import { z } from "zod";

const registerUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Full name is required"),

    email: z
      .string()
      .email("Invalid email format"),

    userType: z
      .string()
      .min(1, "User type is required"),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),

    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
  })
  // validate that password === confirmPassword
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Password and confirm password must match",
      path: ["confirmPassword"],
    }
  ),
});

const loginValidationSchema = z.object({
    body: z.object({
        email: z.string().email('Email must be a valid email'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
    }),
});

const verifyCodeValidation = z.object({
    body: z.object({
        email: z.string().email('Email must be a valid email'),
        verifyCode: z.string().min(4, 'Verification code must be at least 4 characters'),
    }),
});

const sendVerifyCodeValidation = z.object({
    body: z.object({
        email: z.string().trim().toLowerCase().email('Email must be a valid email')
    }),
});

const resetPasswordValidation = z.object({
    body: z.object({
        email: z.string().trim().toLowerCase().email('Email must be a valid email'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
        confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
      })
      // validate that password === confirmPassword
      .refine(
        (data) => data.newPassword === data.confirmPassword,
        {
          message: "Password and confirm password must match",
          path: ["confirmPassword"],
        }
      ),
});

const changePasswordValidationSchema = z.object({
    body: z.object({
        currentPassword: z.string().optional(),
        oldPassword: z.string().optional(),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
        confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters').optional(),
    })
    .refine((data) => Boolean(data.currentPassword || data.oldPassword), {
      message: "Current password is required",
      path: ["currentPassword"],
    })
    .refine(
      (data) => {
        if (data.confirmPassword) {
          return data.newPassword === data.confirmPassword;
        }
        return true;
      },
      {
        message: "Password and confirm password must match",
        path: ["confirmPassword"],
      }
    ),
});

const completeProfileValidationSchema = z.object({
  body: z.object({
    user: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
  })
});

const registerSocialUserValidationSchema = z.object({
  body: z.object({
    provider: z
      .enum(["apple","google"]),

    authToken: z
      .string()
      .min(6, "Auth token is required."),
    
    userType: z
      .string()
      .min(1, "User type is required"),
  })
});

const loginSocialUserValidationSchema = z.object({
  body: z.object({
    provider: z
      .enum(["apple","google"]),

    authToken: z
      .string()
      .min(6, "Auth token is required."),
  })
});

const AuthValidations = { 
    registerUserValidationSchema,
    loginValidationSchema,
    verifyCodeValidation,
    sendVerifyCodeValidation,
    resetPasswordValidation,
    changePasswordValidationSchema,
    completeProfileValidationSchema,
    registerSocialUserValidationSchema,
    loginSocialUserValidationSchema
};
export default AuthValidations;
