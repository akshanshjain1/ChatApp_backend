import mongoose, { Schema } from 'mongoose'
const requestschema = new Schema({
    status: {
        type: String,
        default: 'pending',
        enum: ["pending", "accepted", "rejected"]
    },
    sender: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }, 
    receiver: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },

}, { timestamps: true })
export const FriendRequest = mongoose.models.FriendRequest || mongoose.model('FriendRequest', requestschema)