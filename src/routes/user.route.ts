import express from "express";
import { getMyProfile, login, logout, newuser, searchuser,sendfriendrequest ,acceptfriendrequest,getmynotifications, getmyfriends, authlogin, forgotPassword, resetPassword, AllowAutoPlay, DisableAutoReply} from "../controllers/user.controller.js";
import { singleavatar } from "../middlewares/multer.js";
import { isauthenticated } from "../middlewares/auth.js";
import { acceptfriendrequestvalidator, authLoginvalidater, forgotpasswordvalidator, loginvalidator, registervalidator, resetpasswordvalidator, sendfriendrequestvalidator, validate } from "../lib/validators.js";

const router=express.Router();

router.post('/newuser',singleavatar,registervalidator(),validate,newuser)
router.route('/login').post(loginvalidator(),validate,login)
router.route("/auth0-login").post(authLoginvalidater(),validate,authlogin)
router.route("/forgot-password").post(forgotpasswordvalidator(),validate,forgotPassword)
router.route("/reset-password").post(resetpasswordvalidator(),validate,resetPassword)
router.use(isauthenticated)
router.route('/me').get(getMyProfile)
router.route('/logout').post(logout)
router.route('/search').get(searchuser)

router.route('/sendfriendrequest').put(sendfriendrequestvalidator(),validate,sendfriendrequest)
router.route('/acceptfriendrequest').put(acceptfriendrequestvalidator(),validate,acceptfriendrequest)
router.route('/getmynotifications').get(getmynotifications)
router.route('/getmyfriends').get(getmyfriends)
router.route('/allowAutoReply/:userid').patch(AllowAutoPlay)
router.route('/disableAutoReply/:userid').patch(DisableAutoReply)
export default router