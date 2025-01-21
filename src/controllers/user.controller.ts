import { NextFunction, Request, Response } from "express"
import { User } from "../modals/user.modal.js"
import { IUser, loginrequestbody, Newuserrequestbody } from "../types.js"
import { Trycatch } from "../middlewares/error.js"
import { cookieoption, emitEvent, sendToken, uploadfilesoncloudinary } from "../utils/features.js"
import { compare } from "bcrypt"
import Errorhandler from "../utils/utility-class.js"
import mongoose from "mongoose"
import { Chat } from "../modals/chat.modal.js"
import { FriendRequest } from "../modals/request.modal.js"
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js"

export const newuser = Trycatch(async (req: Request<{}, {}, Newuserrequestbody>, res: Response, next: NextFunction):Promise<any> => {
   
    const { name, username, password, bio } = req.body;
    const file=req.file
    const user=await User.find({username:username});
    if (user.length > 0) {  // Check if the user exists in the database
       
       return next(new Errorhandler("User Already there",400))
          // Return the error and stop further execution
    }
    if(!file?.path)  return next(new Errorhandler("Add avatar",400))

   
    const result:Array<any>=await uploadfilesoncloudinary([file])
        const avatar = {
        public_id: result[0].public_id,
        url: result[0].url
    }
   
    const newUser: IUser = await User.create({
        name, username, password, bio, avatar
    })

    sendToken(res, newUser, 201, "User Created")


})
const login = Trycatch(async (req: Request<{}, {}, loginrequestbody>, res: Response, next: NextFunction): Promise<any> => {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select("+password");
    if (!user)
        return next(new Errorhandler('User Not Found', 400))
    const ismatch = await compare(password, user.password);
    if (!ismatch)
        return next(new Errorhandler('Invalid Credentials', 400))
    sendToken(res, user, 201, `Welcome Back ${user.name}`)
})

const getMyProfile = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const UserId = req.user;
    const user = await User.findById(UserId);
    if(!user) return next(new Errorhandler("User not found",404))
    return res.status(200).json({ message: 'user found successfully', user})

})

const logout = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const UserId = req.user;
    return res.status(200).cookie("accesstoken", "", { ...cookieoption, maxAge: 0 }).json({ message: "Logout Successfully " })
})

const searchuser = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { name = "" } = req.query;

    const mychats = await Chat.find({
        members: req.user,
        groupchat: false
    });
    let friends: Array<mongoose.Types.ObjectId> = [];
    friends = mychats.map((chat) => chat.members).flat();
    const notfriends = await User.find({ _id: { $nin: friends }, name: { $regex: name, $options: "i" } });
    const users = notfriends.map(({ _id, avatar, name }) => ({ _id, name, avatar: avatar.url }))
    return res.status(200).json({ success: true, users })

})

const sendfriendrequest = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const request = await FriendRequest.findOne({
        $or: [
            { sender: req.user, receiver: userId },
            { sender: userId, receiver: req.user },

        ]
    });
    if (request) return next(new Errorhandler("Request already sent bro...", 400));

    await FriendRequest.create({
        sender: req.user,
        receiver: userId,

    })
    emitEvent(req, NEW_REQUEST, [userId], "request")
    return res.status(200).json({ success: 200, message: "Friend Request sent successfully" })


})

const acceptfriendrequest = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    
    const {requestId,accept } = req.body;
    const requserid=req.user||""
   
    const request = await FriendRequest.findById(requestId).populate("sender","name").populate("receiver","name")
    if (!request) return next(new Errorhandler(" No Request exits bro...", 400));
    
    if(request.receiver._id.toString()!== requserid.toString())
            return next(new Errorhandler("this is not your request",400))
    
    if(!accept){
            await request.deleteOne()
            return res.status(200).json({success:true,message:"Aapne Friend Request Successfully Reject kar di"})}
    
    const  members=[request.sender._id,request.receiver._id];
    await Promise.all([Chat.create({
        members,
        name:`${request.sender.name}-${request.receiver.name}`
    }),request.deleteOne()])

    emitEvent(req,REFETCH_CHATS,members)
    return res.status(200).json({ success: 200, message: "Friend Request Accepted",senderId:request.sender._id })


})

const getmynotifications = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
      const request = await FriendRequest.find({receiver:req.user}).populate("sender","name avatar")

    const allrequest=request.map(({_id,sender})=>({_id,sender:{_id:sender._id,name:sender.name,avatar:sender.avatar.url}}))
   
    return res.status(200).json({ success: 200,allrequest })


})

const getmyfriends = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const chatid=req.query.chatid
    const chats = await Chat.find({
        members: req.user,
        groupchat: false
    }).populate("members","name avatar");

    const friends=chats.map(({members})=>{
       const otherUser:any= members.filter((member)=>req.user?.toString()!==member._id.toString())[0];
       
       return {
        _id:otherUser._id,
        name:otherUser.name,
        avatar:otherUser.avatar.url
       }
    });

    if(chatid){
        const chat=await Chat.findById(chatid);
        const availablefriends=friends.filter(({_id})=>!chat?.members.includes(_id));
        return res.status(200).json({success:true,availablefriends})
    }
    else return res.status(200).json({success:true,friends})
  
  


})
export {
    login,
    getMyProfile,
    logout,
    searchuser,
    sendfriendrequest,
    acceptfriendrequest,
    getmynotifications,
    getmyfriends
}