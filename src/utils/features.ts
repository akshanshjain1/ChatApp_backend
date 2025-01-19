import mongoose from "mongoose"
import { CookieOptions, Request, Response } from "express"
import jwt from 'jsonwebtoken'
import { IUser } from "../types.js"
import {v4 as uuid } from 'uuid'
import {v2 as cloudinary} from 'cloudinary'
import { getBase64, getSockets } from "../lib/helper.js"
import fs from 'fs'
import dotenv from 'dotenv'
import { io } from "../app.js"
import { NEW_MESSAGE } from "../constants/events.js"
dotenv.config()
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
})
const cookieoption:CookieOptions={
    httpOnly:true,
    sameSite:"none",
    maxAge:3*24*60*60*1000,
    secure:true
}
 const connectdb=async():Promise<void>=>{
  
    try {
        //console.log(`${process.env.MONGODB_URI}`)
        const data=await mongoose.connect(`${process.env.MONGODB_URI}/ChatAPP`)
        
    } catch (error) {
        console.log('NOT connected to db')
        process.exit(1);
    }
}

const sendToken=(res:Response<any, Record<string, any>>,user:IUser,code:number,message:string)=>{
       
    const token=jwt.sign({
            _id:user._id,

        },process.env.JWT_SECRET||"")
        
        const userobject=user.toObject()
        delete userobject?.password
        return res.status(code).cookie("accesstoken",token,cookieoption).json({success:true,message,data:userobject})

}

const emitEvent=(req:Request,event:string,users:mongoose.Types.ObjectId[],data?:any)=>{
    
    const usersocket=getSockets(users);
    
    const io=req.app.get("io")
    io.to(usersocket).emit(event,data)
    
    
}

const uploadfilesoncloudinary=async(files:any[]=[])=>{
   
    const uploadpromises=files.map((file)=>{
        return new Promise((resolve,reject)=>{
            cloudinary.uploader.upload(file.path,{
                resource_type:"auto",
                public_id:uuid()
            },
        (error,result)=>{
            if(error) {
                fs.unlinkSync(file.path);
                return reject(error)};
                fs.unlinkSync(file.path);
                resolve(result)
        })
        })
    })
    try{
        const results=await Promise.all(uploadpromises);
        const formattedresult=results.map((result:any)=>({
            public_id:result.public_id,
            url:result.secure_url
        }))
        return formattedresult
    }
    catch(err){
        throw new Error(`Error in uploading files to cloudinary  err->${err}`)
    }
}
const deletefilesfromcloudinary=async(files :any[]=[])=>{}
export {connectdb,sendToken,cookieoption,emitEvent,deletefilesfromcloudinary,uploadfilesoncloudinary}