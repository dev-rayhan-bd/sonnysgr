import { z } from "zod";

export const updateprofileValidation = z.object({
    body: z.object({
        name: z.string().optional(),
        // phone: z.string().optional(),
    }),
});

export const addImportantDaysValidation = z.object({
    body: z.object({
        label: z.string().min(1, "Location is required"),
        image: z.string().min(1, "Role is required"),
        date: z.coerce.date({message: "Date is required"}),
        // latitude: z.string().min(1, "Latitude is required"),
        // longitude: z.string().min(1, "Longitude is required"),
    }),
});

export const addNextMeetValidation = z.object({
    body: z.object({
        // label: z.string().min(1, "Location is required"),
        // role: z.string().min(1, "Role is required"),
        date: z.coerce.date({message: "Date is required"}),
       
    }),
});

export const addDesireMood = z.object({
    body: z.object({
        imoji: z.string().min(1, "Imoji is required"),
        mood: z.string().min(1, "Mood is required"),
    }),
});

const changePasswordValidation = z.object({
    body: z.object({
        currentPassword: z.string().min(6,'Old password must be at least 4 characters'),
        newPassword: z.string().min(6, 'New password must be at least 4 characters'),
        confirmPassword: z.string().min(6, 'Confirm password must be at least 4 characters'),
        
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

const UserValidations = { 
    updateprofileValidation,
    addImportantDaysValidation, 
    addNextMeetValidation,
    addDesireMood, 
    changePasswordValidation 
};
export default UserValidations;