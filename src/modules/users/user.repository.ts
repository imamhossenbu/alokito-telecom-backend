import { Types, FilterQuery } from "mongoose";
import { UserModel, UserDocument, CreatedByTypeType } from "./user.model";
import { AccountStatus, AccountStatusType } from "../../shared/enums";
import { getSkip, PaginationParams } from "../../shared/pagination/paginate";

export const userRepository = {
  findByEmailNormalized(emailNormalized: string, withPinHash = false) {
    const query = UserModel.findOne({ emailNormalized });
    return withPinHash ? query.select("+pinHash") : query;
  },

  findByPhone(phone: string, withPinHash = false) {
    const query = UserModel.findOne({ phone });
    return withPinHash ? query.select("+pinHash") : query;
  },

  findById(id: string | Types.ObjectId, withPinHash = false) {
    const query = UserModel.findOne({ _id: id, deletedAt: { $exists: false } });
    return withPinHash ? query.select("+pinHash") : query;
  },

  async create(
    data: {
      name: string;
      email: string;
      emailNormalized: string;
      phone: string;
      pinHash: string;
      createdByType: CreatedByTypeType;
      createdById?: Types.ObjectId;
      mustChangePin?: boolean;
      accountStatus?: (typeof AccountStatus)[keyof typeof AccountStatus];
    },
    session?: import("mongoose").ClientSession,
  ): Promise<UserDocument> {
    const [user] = await UserModel.create(
      [
        {
          ...data,
          accountStatus: data.accountStatus ?? AccountStatus.ACTIVE,
          mustChangePin: data.mustChangePin ?? false,
        },
      ],
      { session },
    );
    return user;
  },

  async markEmailVerified(
    userId: Types.ObjectId,
    session?: import("mongoose").ClientSession,
  ) {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerifiedAt: new Date(),
          accountStatus: AccountStatus.ACTIVE,
        },
      },
      { session },
    );
  },

  async updateLastLogin(userId: Types.ObjectId) {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { lastLoginAt: new Date() } },
    );
  },

  async updatePinHash(
    userId: Types.ObjectId,
    pinHash: string,
    mustChangePin: boolean,
  ) {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { pinHash, mustChangePin } },
    );
  },

  existsByEmailOrPhone(emailNormalized: string, phone: string) {
    return UserModel.exists({ $or: [{ emailNormalized }, { phone }] });
  },

  async updateProfile(
    userId: Types.ObjectId,
    data: { name?: string; phone?: string; email?: string; status?: string; district?: string; address?: string },
  ) {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.email !== undefined) {
      update.email = data.email;
      update.emailNormalized = data.email.toLowerCase().trim();
    }
    if (data.status !== undefined) update.accountStatus = data.status;
    if (data.district !== undefined) update.district = data.district;
    if (data.address !== undefined) update.address = data.address;
    return UserModel.findOneAndUpdate(
      { _id: userId },
      { $set: update },
      { new: true },
    );
  },

  async updateProfileImage(
    userId: Types.ObjectId,
    publicId: string,
    url: string,
  ) {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { profileImagePublicId: publicId, profileImageUrl: url } },
    );
  },

  async listAndCount(
    filter: { search?: string; status?: AccountStatusType; district?: string },
    pagination: PaginationParams,
    sort: { field: "createdAt" | "name"; order: "asc" | "desc" },
  ) {
    const query: FilterQuery<UserDocument> = { deletedAt: { $exists: false } };
    if (filter.status) query.accountStatus = filter.status;
    if (filter.district) query.district = filter.district;
    if (filter.search) {
      const regex = new RegExp(filter.search.trim(), "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const sortSpec: Record<string, 1 | -1> = {
      [sort.field]: sort.order === "asc" ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      UserModel.find(query)
        .sort(sortSpec)
        .skip(getSkip(pagination))
        .limit(pagination.limit),
      UserModel.countDocuments(query),
    ]);

    return { items, total };
  },

  async setAccountStatus(userId: Types.ObjectId, status: AccountStatusType) {
    return UserModel.findOneAndUpdate(
      { _id: userId },
      { $set: { accountStatus: status } },
      { new: true },
    );
  },

  async softDelete(userId: Types.ObjectId, deletedBy: Types.ObjectId) {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          accountStatus: AccountStatus.DELETED,
          deletedAt: new Date(),
          deletedBy,
        },
      },
    );
  },
};
