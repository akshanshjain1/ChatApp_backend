import express from "express";
import { isauthenticated } from "../middlewares/auth.js";
import {  addMembers, deletechat, getchatdetails, getMyChats, getMyGrps, leavefromgrp, newGrpChat, removeMember ,renamegroup,sendattachments,getmessages} from "../controllers/chat.controller.js";
import { attachments } from "../middlewares/multer.js";
import { addmembervalidator, chatidvalidator, getmessagesvalidator, leavegroupvalidator, newgrpchatvalidator, removemembervalidator, renamegrpvalidator, sendattachmentsvalidator, validate } from "../lib/validators.js";
import { ChatwithAI } from "../controllers/ai-chat.controller.js";

const router=express.Router();
router.use(isauthenticated)

router.route('/new').post(newgrpchatvalidator() ,validate,newGrpChat)
router.route('/mychats').get(getMyChats)
router.route('/mygroups').get(getMyGrps)
router.route('/addmember').put(addmembervalidator(),validate,addMembers)
router.route('/removemember').delete(removemembervalidator(),validate,removeMember)
router.route('/leave/:id').delete(leavegroupvalidator(),validate,leavefromgrp);
router.route('/message').post(attachments,sendattachmentsvalidator(),validate,sendattachments)
router.route("/ai-chat").post(ChatwithAI)
router.route('/message/:id').get(getmessagesvalidator(),validate,getmessages)
router.route("/:id").get(chatidvalidator(),validate,getchatdetails).put(renamegrpvalidator(),validate,renamegroup).delete(chatidvalidator(),validate,deletechat)

export default router