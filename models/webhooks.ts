import mongoose from 'mongoose';
import { Document, Schema } from 'mongoose';

export interface IStats extends Document {
    _id: string;
    count: number;
}

export const webhooks = mongoose.model<IStats>("webhooks", new Schema({
    _id: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        required: true
    }
}));