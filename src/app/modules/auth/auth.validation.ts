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

    // shoeSize: z
    //   .number()
    //   .min(1, "Shoe size must be at least 1")
    //   .optional(),

    // latitude: z
    //   .number()
    //   .refine((value) => value >= -90 && value <= 90, {
    //     message: "Latitude must be between -90 and 90",
    //   })
    //   .optional(),

    // longitude: z
    //   .number()
    //   .refine((value) => value >= -180 && value <= 180, {
    //     message: "Longitude must be between -180 and 180",
    //   })
    //   .optional(),
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
        // email: z.string().trim().toLowerCase().email('Email must be a valid email'),
        newPassword: z.string().min(4, 'New password must be at least 4 characters'),
        confirmPassword: z.string().min(4, 'Confirm password must be at least 4 characters'),
        
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
        oldPassword: z.string().min(1, 'Old password must be at least 6 characters'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    }),
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