import { NextFunction, Request, Response } from "express";
import { Trycatch } from "../middlewares/error.js";
import { User } from "../modals/user.modal.js";
import { Chat } from "../modals/chat.modal.js";
import { Message } from "../modals/message.modal.js";
import Errorhandler from "../utils/utility-class.js";
import  jwt  from "jsonwebtoken";
import { cookieoption } from "../utils/features.js";
const adminlogin=Trycatch(async(req:Request,res:Response,next:NextFunction)=>{
    const {secretkey}=req.body;
    const adminsecretkey=process.env.ADMIN_SECRET_KEY||""
    const ismatch=adminsecretkey===secretkey
    if(!ismatch) return next(new Errorhandler("Secret Key Not Match",401));
    
    const token=jwt.sign(secretkey,process.env.JWT_SECRET||"");

    return res.cookie("admin-accesstoken",token,{...cookieoption,maxAge:1000*60*60}).status(200).json({success:true,message:"Admin Login Successfull"})
})

const adminlogout=Trycatch(async(req:Request,res:Response,next:NextFunction)=>{
    return res.cookie("admin-accesstoken","",{...cookieoption,maxAge:0}).status(200).json({success:true,message:"Admin Logout Successfull"})
})
const allusers=Trycatch(async(req:Request,res:Response)=>{
    const users=await User.find({});
    const transformusers=await Promise.all(users.map(async({name,avatar,username,_id})=>{
        const [groupcount,friendscount]=await Promise.all([Chat.countDocuments({groupchat:true,members:_id}),Chat.countDocuments({groupchat:false,members:_id})])
        return {
            name,
            username,
            avatar:avatar.url,
            _id,
            groupcount,
            friendscount
        }
    }))
    return res.status(200).json({success:true,transformusers})
})

const allchats=Trycatch(async(req:Request,res:Response)=>{
    const chats:any=await Chat.find({}).populate("members","name avatar").populate("creater","name avatar") as any;
   
    const transformchats=await Promise.all(chats.map(async({members,_id,groupchat,name,creater}:any)=>{
        const totalmessages=await Message.countDocuments({chatid:_id})
        return {
            _id,
            name,
            groupchat,
            avatar:members.slice(0,3).map((member:any)=>member.avatar.url),
           members:members.map(({_id,name,avatar}:any)=>({
            _id,name,avatar:avatar.url
           })),
           creater:{
           
            name:creater?.name||"None",
            avatar:creater?.avatar?.url||""

           } ,
           totalmembers:members.length,
           totalmessages
           }
    }))
    return res.status(200).json({success:true,transformchats})
})
const allmessages=Trycatch(async(req:Request,res:Response)=>{
    const messages=await Message.find({}).populate("sender","name avatar").populate("chatid","groupchat");
    const transformmessages=messages.map(({content,attachments,_id,sender,createdAt,chatid})=>({
        _id,
        attachments,
        content,
        createdAt,
        chatid:chatid._id,
        groupchat:chatid.groupchat,
        sender:{
            _id:sender._id,
            name:sender.name,
            avatar:sender.name.url
        }
    }))
    return res.status(200).json({success:true,transformmessages})
})

const getdashboardstats=Trycatch(async(req:Request,res:Response)=>{
    
    const [groupscount,userscount,messagecount,totalchatscount]=await Promise.all([
        Chat.countDocuments({groupchat:true}),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments()
    ])

    const today=new Date();
    const last7days=new Date();
    last7days.setDate(last7days.getDate()-7);

    const last7daysmessages=await Message.find({
        createdAt:{
            $gte:last7days,
            $lte:today
        }
    }).select("createdAt") 
    const daysinMS=1000*60*60*24
    const messages=new Array(7).fill(0);
    last7daysmessages.forEach((message)=>{
        const indexapprox=((today.getTime()-message.createdAt.getTime())/daysinMS);
        const index=Math.floor(indexapprox);
        messages[6-index]++;
    })
    
    const stats={groupscount,userscount,messagecount,totalchatscount,messageschart:messages}
    return res.status(200).json({success:true,stats})
})

const getadmindata=Trycatch(async(req:Request,res:Response)=>{
    
    
    return res.status(200).json({admin:true})
})

export {
    allusers,
    allchats,
    allmessages,
    getdashboardstats,
    adminlogin,
    adminlogout,
    getadmindata
}