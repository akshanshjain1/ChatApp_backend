import mongoose, { Document, Schema} from 'mongoose'
import {hash} from 'bcrypt'
import { IUser } from '../types.js'

const userschema=new Schema<IUser>({
    name:{
        type:String,
        required:true
    },
    username:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String ,
        required:false,
        select:false
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    authtype:{
        type:String,
        required:true,
        default:"manual"
    },
    avatar:{
        public_id:{
            type:String,
            required:true
        },
        url:{
            type:String,
            required:true
        },
       
    },
    bio:{
        type:String,
        required:false
    },
    allowAutoReply:{
        type:Boolean,
        default:false
    },
    resetPasswordToken:{
        type:String,
        required:false,
    },
    resetPasswordTokenExpiry:{
        type:String,
        required:false,
    },
    fcmToken:{
        type:String,
        default:null
    }
   


},{timestamps:true})
userschema.pre("save",async function(next){
    if(!this.isModified("password") || !this.password) 
        return next();
    const newpassword=await hash(this.password as string,10)
    this.password=newpassword;
})
export const User=mongoose.models.User || mongoose.model<IUser>('User',userschema)