import mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

export interface IBan extends Document {
    _id: string;
    message: string;
    response_code: number;
}

export const caches = mongoose.model<IBan>("caches", new Schema({
    _id: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    response_code: {
        type: Number,
        required: true
    }
}));