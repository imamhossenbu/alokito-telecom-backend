import { Types, ClientSession } from "mongoose";
import {
  UserIdentityModel,
  NidExtractionStatus,
  NidVerificationStatus,
} from "./identity.model";

export const identityRepository = {
  findByUserId(userId: Types.ObjectId) {
    return UserIdentityModel.findOne({ userId }).select(
      "+nidNumber +dateOfBirth +address +nidFrontImagePublicId +nidFrontImageFormat +nidBackImagePublicId +nidBackImageFormat",
    );
  },

  async createFromRegistration(
    data: {
      userId: Types.ObjectId;
      nidNumber?: string;
      name?: string;
      nameBn?: string;
      fatherName?: string;
      motherName?: string;
      dateOfBirth?: Date;
      address?: string;
      gender?: string;
      nidFrontImagePublicId?: string;
      nidFrontImageFormat?: string;
      nidBackImagePublicId?: string;
      nidBackImageFormat?: string;
    },
    session?: ClientSession,
  ) {
    const [identity] = await UserIdentityModel.create(
      [
        {
          userId: data.userId,
          nidNumber: data.nidNumber ?? "",
          name: data.name,
          nameBn: data.nameBn,
          fatherName: data.fatherName,
          motherName: data.motherName,
          dateOfBirth: data.dateOfBirth ?? new Date(0),
          address: data.address ?? "",
          gender: data.gender ?? "MALE",
          nidFrontImagePublicId: data.nidFrontImagePublicId,
          nidFrontImageFormat: data.nidFrontImageFormat,
          nidBackImagePublicId: data.nidBackImagePublicId,
          nidBackImageFormat: data.nidBackImageFormat,
          extractionStatus: NidExtractionStatus.CONFIRMED,
          verificationStatus: NidVerificationStatus.CONFIRMED,
        },
      ],
      { session },
    );
    return identity;
  },

  async createForCustomerCreatedUser(
    data: {
      userId: Types.ObjectId;
      nidNumber?: string;
      dateOfBirth?: Date;
      address?: string;
    },
    session?: ClientSession,
  ) {
    const [identity] = await UserIdentityModel.create(
      [
        {
          userId: data.userId,
          nidNumber: data.nidNumber ?? "",
          dateOfBirth: data.dateOfBirth ?? new Date(0),
          address: data.address ?? "",
          // No NID image for customer/admin-created accounts (spec section 10, 11).
          extractionStatus: NidExtractionStatus.CONFIRMED,
          verificationStatus: NidVerificationStatus.REVIEW_REQUIRED,
        },
      ],
      { session },
    );
    return identity;
  },
};
