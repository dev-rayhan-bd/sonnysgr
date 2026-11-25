import { z } from "zod";
import { ADMIN_PERMISSIONS } from "../auth/Dashboard.validation";
import { idParamSchema } from "../dashboard.shared";

const getAllAdminsValidation = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    role: z.enum(["Admin", "Super_Admin"]).optional(),
    isBlocked: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort: z.string().optional(),
  }),
});

const updateAdminValidation = idParamSchema().extend({
  body: z
    .object({
      name: z.string().min(1).optional(),
      phone: z.string().min(5).optional(),
      contact: z.string().min(5).optional(),
      address: z.string().min(1).optional(),
      role: z.enum(["Admin", "Super_Admin"]).optional(),
      permissions: z.array(z.enum(ADMIN_PERMISSIONS)).optional(),
    })
    .strict(),
});

const AdminManagementValidations = {
  getAllAdminsValidation,
  adminIdValidation: idParamSchema(),
  updateAdminValidation,
};

export default AdminManagementValidations;
