import mongoose, {Schema} from 'mongoose'
import { IMessage } from '../types.js'

const messageschema=new Schema<IMessage>({
    content:String,
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    chatid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Chat",
        required:true
    },
    attachments:[
        {
            public_id:{
                type:String,
                required:true
            },
            url:{
                type:String,
                required:true
            }
        }
    ]


},{timestamps:true})
export const Message=mongoose.models.Message || mongoose.model<IMessage>('Message',messageschema)