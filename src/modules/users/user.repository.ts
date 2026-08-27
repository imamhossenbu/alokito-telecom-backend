import { Types } from "mongoose";
import { UserModel, UserDocument, CreatedByTypeType } from "./user.model";
import { AccountStatus } from "../../shared/enums";

export const userRepository = {
  findByEmailNormalized(emailNormalized: string, withPinHash = false) {
    const query = UserModel.findOne({ emailNormalized });
    return withPinHash ? query.select("+pinHash") : query;
  },

  findByPhone(phone: string) {
    return UserModel.findOne({ phone });
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
};
