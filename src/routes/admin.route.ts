import express from "express"
import { adminlogin, adminlogout, allchats, allmessages, allusers, getadmindata, getdashboardstats } from "../controllers/admin.controller.js";
import { adminloginvalidator, validate } from "../lib/validators.js";
import { adminonly } from "../middlewares/auth.js";
const router=express();


router.route('/verify').post(adminloginvalidator(),validate,adminlogin);
router.route('/logout').post(adminlogout);
router.use(adminonly)
router.route('/').get(getadmindata);
router.route('/users').get(allusers);
router.route('/chats').get(allchats);
router.route('/messages').get(allmessages);
router.route('/stats').get(getdashboardstats);
export default router
