import ApiError from "../../../../error/ApiError";
import QueryBuilder from "../../../builder/QueryBuilder";
import AdminModel from "../auth/Admin.model";
import { IAdmin } from "../auth/Dashboard.interface";

const SAFE_FIELDS = "-password -verificationCode -verificationCodeExpiresAt -__v";

type TAdminUpdate = Pick<IAdmin, "name" | "phone" | "contact" | "address" | "role" | "permissions">;

const getAllAdmins = async (query: Record<string, unknown>) => {
  const filterQuery = { ...query };
  if (filterQuery.isBlocked !== undefined) filterQuery.isBlocked = filterQuery.isBlocked === "true";

  const queryBuilder = new QueryBuilder(AdminModel.find().select(SAFE_FIELDS), filterQuery)
    .search(["name", "email", "phone"])
    .filter()
    .sort()
    .paginate();

  const data = await queryBuilder.modelQuery.lean();
  const meta = await queryBuilder.countTotal();
  return { meta, data };
};

const getSingleAdmin = async (id: string) => {
  const admin = await AdminModel.findById(id).select(SAFE_FIELDS).lean();
  if (!admin) throw new ApiError(404, "Admin not found");
  return admin;
};

/** Super_Admin edits another admin's details, role and permissions (whitelisted fields only). */
const updateAdmin = async (actorId: string, id: string, payload: TAdminUpdate) => {
  const admin = await AdminModel.findById(id);
  if (!admin) throw new ApiError(404, "Admin not found");

  if (String(admin._id) === String(actorId) && payload.role && payload.role !== admin.role) {
    throw new ApiError(400, "You cannot change your own role");
  }

  const allowed: (keyof TAdminUpdate)[] = ["name", "phone", "contact", "address", "role", "permissions"];
  allowed.forEach((key) => {
    if (payload[key] !== undefined) (admin as any)[key] = payload[key];
  });
  await admin.save();

  return getSingleAdmin(id);
};

const deleteAdmin = async (actorId: string, id: string) => {
  if (String(actorId) === String(id)) {
    throw new ApiError(400, "Use /dashboard/delete-admin to delete your own account");
  }

  const admin = await AdminModel.findById(id).select("role").lean<{ role: string }>();
  if (!admin) throw new ApiError(404, "Admin not found");
  if (admin.role === "Super_Admin") throw new ApiError(403, "A Super Admin cannot be deleted");

  await AdminModel.deleteOne({ _id: id });
  return null;
};

const AdminManagementService = { getAllAdmins, getSingleAdmin, updateAdmin, deleteAdmin };

export default AdminManagementService;
