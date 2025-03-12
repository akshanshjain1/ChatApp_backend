import { NextFunction, Request, Response } from "express"
import { User } from "../modals/user.modal.js"
import { authloginrequestbody, IUser, loginrequestbody, Newuserrequestbody } from "../types.js"
import { Trycatch } from "../middlewares/error.js"
import { cookieoption, emitEvent, sendToken, uploadfilesoncloudinary } from "../utils/features.js"
import { compare } from "bcrypt"
import Errorhandler from "../utils/utility-class.js"
import mongoose from "mongoose"
import { Chat } from "../modals/chat.modal.js"
import { FriendRequest } from "../modals/request.modal.js"
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js"
import axios from "axios"
import { decodeGoogleToken, generateUniqueUsername } from "../lib/helper.js"
import crypto from "crypto"
import { sendEmail } from "../services/resend.js"

export const newuser = Trycatch(async (req: Request<{}, {}, Newuserrequestbody>, res: Response, next: NextFunction): Promise<any> => {

    const { name, username, password, bio, email } = req.body;
    const file = req.file
    const user = await User.find({ username: username });
    if (user.length > 0) {  // Check if the user exists in the database

        return next(new Errorhandler("User Already there", 400))
        // Return the error and stop further execution
    }
    if (!file?.path) return next(new Errorhandler("Add avatar", 400))


    const result: Array<any> = await uploadfilesoncloudinary([file])
    const avatar = {
        public_id: result[0].public_id,
        url: result[0].url
    }

    const newUser: IUser = await User.create({
        name, username, password, bio, avatar, email, authtype: "manual"
    })

    sendToken(res, newUser, 201, "User Created")


})
const login = Trycatch(async (req: Request<{}, {}, loginrequestbody>, res: Response, next: NextFunction): Promise<any> => {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select("+password");

    if (!user)
        return next(new Errorhandler('User Not Found', 400))

    if (user.authtype !== "manual")
        return next(new Errorhandler('Please Reset Password to login manually', 402))

    const ismatch = await compare(password, user.password);

    if (!ismatch)
        return next(new Errorhandler('Invalid Credentials', 400))

    sendToken(res, user, 201, `Welcome Back ${user.name}`)
})

const authlogin = Trycatch(async (req: Request<{}, {}, authloginrequestbody>, res: Response, next: NextFunction): Promise<any> => {

    const { email, authtype, avatar, name } = req.body;

    // const auth0Domain = process.env.AUTH0_DOMAIN;

    // const response = await axios.get(`https://${auth0Domain}/userinfo`, {
    //     headers: { Authorization: `Bearer ${token}` },
    //   });
    //   const { email, name, sub } = response.data;

    const user = await User.findOne({ email }).select("+password")



    if (!user) {
        const username = await generateUniqueUsername(name);


        const picture = {
            public_id: `${Date.now()}`,
            url: avatar
        }

        const newuser = await new User({
            name, username, avatar: picture, authtype, email
        })
        const newUser = await newuser.save()

        sendToken(res, newUser, 201, "User Created")

    }
    else
        sendToken(res, user, 201, `Welcome Back ${user.name}`)

})


const forgotPassword = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body
   
    const user = await User.findOne({ email })
    if (!user) return next(new Errorhandler("User not found", 404))
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordTokenExpiry = Date.now() + 10 * 60 * 1000; // valid for 10 minutes
    await user.save()
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
        await sendEmail({
            to: email,
            subject: "Reset Your Password",
            text: `Click the link to reset your password: ${resetUrl}`
        });
        return res.status(200).json({ message: "Password reset link sent to email!" });
    } catch (error) {
        // If email sending fails, clear reset fields
        user.resetPasswordToken = null;
        user.resetPasswordTokenExpiry = null;
        await user.save();
        return res.status(500).json({ message: "Error sending email" });
    }


})
const resetPassword = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { password, token } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return next(new Errorhandler("Invalid or Expired Token", 402))
    user.password=password;
    user.resetPasswordToken=null;
    user.resetPasswordTokenExpiry=null;
    user.authtype="manual";
    await user.save()
    return res.status(200).json({ message: 'password reset successfully', user })

})

const getMyProfile = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const UserId = req.user;
    const user = await User.findById(UserId);
    if (!user) return next(new Errorhandler("User not found", 404))


    return res.status(200).json({ message: 'user found successfully', user })

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

    const { requestId, accept } = req.body;
    const requserid = req.user || ""

    const request = await FriendRequest.findById(requestId).populate("sender", "name").populate("receiver", "name")
    if (!request) return next(new Errorhandler(" No Request exits bro...", 400));

    if (request.receiver._id.toString() !== requserid.toString())
        return next(new Errorhandler("this is not your request", 400))

    if (!accept) {
        await request.deleteOne()
        return res.status(200).json({ success: true, message: "Aapne Friend Request Successfully Reject kar di" })
    }

    const members = [request.sender._id, request.receiver._id];
    await Promise.all([Chat.create({
        members,
        name: `${request.sender.name}-${request.receiver.name}`
    }), request.deleteOne()])

    emitEvent(req, REFETCH_CHATS, members)
    return res.status(200).json({ success: 200, message: "Friend Request Accepted", senderId: request.sender._id })


})

const getmynotifications = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const request = await FriendRequest.find({ receiver: req.user }).populate("sender", "name avatar")

    const allrequest = request.map(({ _id, sender }) => ({ _id, sender: { _id: sender._id, name: sender.name, avatar: sender.avatar.url } }))

    return res.status(200).json({ success: 200, allrequest })


})

const getmyfriends = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const chatid = req.query.chatid
    const chats = await Chat.find({
        members: req.user,
        groupchat: false
    }).populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
        const otherUser: any = members.filter((member) => req.user?.toString() !== member._id.toString())[0];

        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url
        }
    });

    if (chatid) {
        const chat = await Chat.findById(chatid);
        const availablefriends = friends.filter(({ _id }) => !chat?.members.includes(_id));
        return res.status(200).json({ success: true, availablefriends })
    }
    else return res.status(200).json({ success: true, friends })




})
export {
    login,
    authlogin,
    forgotPassword,
    resetPassword,
    getMyProfile,
    logout,
    searchuser,
    sendfriendrequest,
    acceptfriendrequest,
    getmynotifications,
    getmyfriends
}