import mongoose, {Schema} from 'mongoose'
import { IChat } from '../types.js'

const chatschema=new Schema<IChat>({
    name:{
        type:String,
        required:true
    },
    groupchat:{
        type:Boolean,
        default:false
    },
    creater:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    members:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    ]
    
},{timestamps:true})
export const Chat=(mongoose.models.Chat as mongoose.Model<IChat>)|| mongoose.model<IChat>('Chat',chatschema)