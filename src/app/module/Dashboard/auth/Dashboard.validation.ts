import {z} from "zod";

export const createAdminvalidation = z.object({
  body: z.object({
    name: z.string().min(1, "Profile id is required"),
    email: z.string().email("Valid email required"),
    phone: z.string().min(5, "Phone Number is required"),
    password: z.string().min(5, "Password is required"),
  })
});

export const editProfilevalidation = z.object({
  body: z.object({
    name: z.string().min(1, "Profile id is required").optional(),
    address: z.string().min(1, "Address is required").optional(),
    phone: z.string().min(5, "Phone Number is required").optional(),
    contact: z.string().min(5, "Contact no. is required").optional(),
  })
});

export const adminLoginValidation = z.object({
  body: z.object({
    email: z.string().email().min(1, "Valid email required"),
    password: z.string().min(5, "password is required"),
  })
});

export const changeAdminPasswordValidation = z.object({
    body: z.object({
        oldPassword: z.string().min(4,'Old password must be at least 5 characters'),
        newPassword: z.string().min(4, 'New password must be at least 5 characters'),
        confirmPassword: z.string().min(4, 'Confirm password must be at least 5 characters'),
        
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

