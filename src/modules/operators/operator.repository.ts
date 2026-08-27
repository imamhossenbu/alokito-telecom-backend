import { Types } from "mongoose";
import { OperatorModel, OperatorDocument, OperatorStatus } from "./operator.model";

export const operatorRepository = {
  findById(id: string | Types.ObjectId) {
    return OperatorModel.findById(id);
  },

  findByCode(code: string) {
    return OperatorModel.findOne({ code: code.toUpperCase() });
  },

  findAllActive() {
    return OperatorModel.find({ status: OperatorStatus.ACTIVE }).sort({ sortOrder: 1, name: 1 });
  },

  findAll() {
    return OperatorModel.find().sort({ sortOrder: 1, name: 1 });
  },

  create(data: Partial<OperatorDocument>) {
    return OperatorModel.create(data);
  },

  update(id: string | Types.ObjectId, data: Partial<OperatorDocument>) {
    return OperatorModel.findByIdAndUpdate(id, data, { new: true });
  },

  delete(id: string | Types.ObjectId) {
    return OperatorModel.findByIdAndDelete(id);
  },
};
