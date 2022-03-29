import mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

export interface IRequests extends Document {
    webhook_id: string;
    status: number;
    method: string;
    debug?: object;
}

export const requests = mongoose.model<IRequests>("requests", new Schema({
    webhook_id: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    debug: {
        type: Object,
        required: false
    }
}, { timestamps: true }));