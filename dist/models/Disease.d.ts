import { Document } from 'mongoose';
import { DatabaseId } from '@/types/common.types';
export interface IDisease extends Document {
    _id: DatabaseId;
    name: string;
    scientificName?: string;
    category: string;
    description: string;
    symptoms: string[];
    causes: string[];
    treatments: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedCrops: string[];
    images: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Disease: import("mongoose").Model<IDisease, {}, {}, {}, Document<unknown, {}, IDisease> & IDisease & Required<{
    _id: string;
}>, any>;
export default Disease;
//# sourceMappingURL=Disease.d.ts.map