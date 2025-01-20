import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ExtendedError, Socket } from "socket.io";
import { User } from "../modals/user.modal.js";
import Errorhandler from "../utils/utility-class.js";
import { Trycatch } from "./error.js";
import { IUser } from "../types.js";




interface CustomJWTPayload extends JwtPayload{
    _id:string  
}
const isauthenticated=Trycatch(async(req:Request,res:Response,next:NextFunction)=>{
    const accesstoken=req.cookies["accesstoken"]
    
    if(!accesstoken)
        return next(new Errorhandler('Please Login',401))
    
    const decodeddata=jwt.verify(accesstoken,process.env.JWT_SECRET||'') as CustomJWTPayload
    

    req.user=decodeddata._id ;
    return next()
})

const adminonly=Trycatch(async(req:Request,res:Response,next:NextFunction)=>{
    const admin_accesstoken=req.cookies["admin-accesstoken"]
    if(!admin_accesstoken)
        return next(new Errorhandler('Pehle Admin Login kariye',401))
    const decodeddata=jwt.verify(admin_accesstoken,process.env.JWT_SECRET||'') as CustomJWTPayload
    if(decodeddata.toString()===process.env.ADMIN_SECRET_KEY)
        next()
    else{
        return next(new Errorhandler("Secret key sahi dijiye",401))
    }
})


const socketauthenticator=async(err:any,socket:Socket,next: (err?: ExtendedError) => void)=>{
    try {
        if(err) return next(err);
        const authtoken=socket?.request?.cookies?.accesstoken;
        if(!authtoken){
            
            return next(new Errorhandler("Please Login to access",401))}
        const decodedtoken=jwt.verify(authtoken,process.env.JWT_SECRET||"") as CustomJWTPayload;
        const user:IUser=await User.findById(decodedtoken._id)  as IUser
        if(!user){
            return next(new Errorhandler("Please Login to access",401))
    
        }
        socket.user=user  
        return next()
    } catch (error) {
        console.log(error);
        // return next(new Errorhandler("Please Login to Access this",400))
        throw error
    }
}
export { adminonly, isauthenticated, socketauthenticator };
