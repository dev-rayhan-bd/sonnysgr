import { z } from "zod";

export const updateprofileValidation = z.object({
    body: z.object({
        name: z.string().optional(),
    }).passthrough(),
});

export const addImportantDaysValidation = z.object({
    body: z.object({
        label: z.string().min(1, "Location is required"),
        image: z.string().min(1, "Role is required"),
        date: z.coerce.date({message: "Date is required"}),
    }),
});

export const addNextMeetValidation = z.object({
    body: z.object({
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

const UserValidations = { 
    updateprofileValidation,
    addImportantDaysValidation, 
    addNextMeetValidation,
    addDesireMood, 
    changePasswordValidation 
};
export default UserValidations;
