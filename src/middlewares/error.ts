import { NextFunction, Request, Response } from "express"
import Errorhandler from "../utils/utility-class.js";
import { ControllerType } from "../types.js";
import { envmode } from "../app.js";

export const errorMiddleware=(err:Errorhandler,req:Request,res:Response,next:NextFunction)=>{
    err.message||="Internal Server Error";
    err.statuscode||=500

    if(err.name==='CastError'){
        
        err.message=`Invalid format of ${err?.path}`;
        err.statuscode=400

    }

    res.status(err.statuscode).json({message:envmode==="DEVELOPMENT"?err:err.message,data:err.data})
}

export const Trycatch=(func:ControllerType)=>(req:Request,res:Response,next:NextFunction)=>{
     Promise.resolve(func(req,res,next)).catch(next)
    
}
