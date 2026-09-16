import { AdminModel } from "./admin.model";

export const adminRepository = {
  findByEmailNormalized(emailNormalized: string, withPasswordHash = false) {
    const query = AdminModel.findOne({ emailNormalized });
    return withPasswordHash ? query.select("+passwordHash") : query;
  },

  async create(data: Partial<Parameters<typeof AdminModel.create>[0]>) {
    return AdminModel.create(data);
  },

  async updateLastLogin(adminId: string) {
    await AdminModel.updateOne(
      { _id: adminId },
      { $set: { lastLoginAt: new Date() } },
    );
  },
};
