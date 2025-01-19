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
        type:String,
        required:true,
        select:false
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
    }

},{timestamps:true})
userschema.pre("save",async function(next){
    if(!this.isModified("password")) 
        return next();
    const newpassword=await hash(this.password as string,10)
    this.password=newpassword;
})
export const User=mongoose.models.User || mongoose.model<IUser>('User',userschema)