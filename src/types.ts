import { NextFunction, Request, Response } from "express";
import mongoose, { Document } from "mongoose";
import { Socket } from "socket.io";

export interface Newuserrequestbody {
    name: string;
    username: string;
    password: string;
    bio:string,
    email:string
    

}
export interface loginrequestbody {
    
    username: string;
    password: string;
    
    

}

export interface authloginrequestbody{
    avatar:string;
    email:string;
    name:string;
    authtype:string
}

export type ControllerType = (
    req: Request, 
    res: Response, 
    next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>

export interface IUser extends Document{
    _id:mongoose.Types.ObjectId
    name?:string,
    username?:string,
    password?:string,
    email?:string,
    authtype?:string,
    avatar?:{
        public_id:string,
        url:string
    },
    bio?:string,
    allowAutoReply?:boolean,
    resetPasswordToken?:string,
    resetPasswordTokenExpiry?:string,
    fcmToken?:string
    
}

export interface IChat  extends Document{
    name:string,
    groupchat:boolean,
    creater:mongoose.Types.ObjectId,
    members:mongoose.Types.ObjectId[]
}

export interface IMessage extends Document{
    content:string,
    sender:mongoose.Types.ObjectId,
    chatid:mongoose.Types.ObjectId,
    attachments:[{
        public_id:string,
        url:string
    }]
}

declare module "http" {
    interface IncomingMessage {
        cookies: { [key: string]: string };
    }
}

declare global {
    namespace Express{
        interface Request{
            user?:string;
        }
    }
   
    
}
declare module 'socket.io' {
    interface Socket {
        user?:IUser;
    }
}


