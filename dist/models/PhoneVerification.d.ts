import mongoose, { Model } from 'mongoose';
import { IPhoneVerification, IPhoneVerificationMethods, IPhoneVerificationStatics, PhoneBlockList } from './PhoneVerification.types';
type PhoneVerificationDocument = IPhoneVerification & IPhoneVerificationMethods;
type PhoneVerificationModel = Model<PhoneVerificationDocument> & IPhoneVerificationStatics;
declare const PhoneVerification: PhoneVerificationModel;
declare const PhoneBlockListModel: mongoose.Model<PhoneBlockList, {}, {}, {}, mongoose.Document<unknown, {}, PhoneBlockList> & PhoneBlockList & Required<{
    _id: string;
}>, any>;
export { PhoneBlockListModel };
export default PhoneVerification;
//# sourceMappingURL=PhoneVerification.d.ts.map