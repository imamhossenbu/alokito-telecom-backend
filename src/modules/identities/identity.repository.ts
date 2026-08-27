import { Types, ClientSession } from "mongoose";
import {
  UserIdentityModel,
  NidExtractionStatus,
  NidVerificationStatus,
} from "./identity.model";

export const identityRepository = {
  async createFromRegistration(
    data: {
      userId: Types.ObjectId;
      nidNumber?: string;
      dateOfBirth?: Date;
      address?: string;
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
          dateOfBirth: data.dateOfBirth ?? new Date(0),
          address: data.address ?? "",
          nidFrontImagePublicId: data.nidFrontImagePublicId,
          nidFrontImageFormat: data.nidFrontImageFormat,
          nidBackImagePublicId: data.nidBackImagePublicId,
          nidBackImageFormat: data.nidBackImageFormat,
          extractionStatus: NidExtractionStatus.PENDING,
          verificationStatus: NidVerificationStatus.PENDING,
        },
      ],
      { session },
    );
    return identity;
  },
};
