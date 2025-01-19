import { NextFunction, Request, Response } from "express";
import { body, check, param, query, validationResult } from "express-validator";
import Errorhandler from "../utils/utility-class.js";
const registervalidator = () => [
   body("name", "Please enter name").notEmpty(),
   body("username", "Please enter username").notEmpty(),
   body("bio", "Please enter bio").notEmpty(),
   body("password", "Please enter password").notEmpty(),
   ];


const loginvalidator = () => [
   body("username", "Please enter username").notEmpty(),
   body("password", "Please enter password").notEmpty()
];

const newgrpchatvalidator = () => [
   body("name", "Please enter name").notEmpty(),
   body("members").notEmpty().withMessage("Please enter members").isArray({ min: 2, max: 100 }).withMessage("Members must be between 2-100")

];


const addmembervalidator = () => [
   body("chatid", "Please enter chat Id").notEmpty(),
   body("members").notEmpty().withMessage("Enter Member").isArray({ min: 1, max: 97 }).withMessage("Members must be 1-97")
]

const removemembervalidator = () => [
   body("chatid", "Please enter chat Id").notEmpty(),
   body("userId", "Please enter user Id").notEmpty(),

]
const leavegroupvalidator = () => [
   param("id", "Please Enter a Id").notEmpty()
]
const sendattachmentsvalidator = () => [
   body("chatid", "Please enter chat Id").notEmpty(),
   

]

const getmessagesvalidator = () => [
   param("id", "Please Enter a Id").notEmpty(),

]

const chatidvalidator = () => [
   param("id", "Please Enter a Id").notEmpty(),
   
]
const renamegrpvalidator = () => [
   param("id", "Please Enter a Id").notEmpty(),

]
const sendfriendrequestvalidator = () => [

   body("userId", "Please enter friends id").notEmpty(),
]

const acceptfriendrequestvalidator = () => [
   body("requestId", "please enter requestId").notEmpty(),
   body("accept").notEmpty().withMessage("Please add accept").isBoolean().withMessage("accept must be boolean")
]

const adminloginvalidator = () => [
   body("secretkey", "please enter secretkey").notEmpty(),
   
]
const validate = (req: Request, res: Response, next: NextFunction) => {
   const errors = validationResult(req);
   const errormessage = errors.array().map((error) => (error.msg)).join(".")

   if (errors.isEmpty())
      return next();
   else {
      next(new Errorhandler(errormessage, 400))
   }
}


export {
   registervalidator,
   validate,
   loginvalidator,
   newgrpchatvalidator,
   addmembervalidator,
   removemembervalidator,
   leavegroupvalidator,
   sendattachmentsvalidator,
   getmessagesvalidator,
   chatidvalidator,
   renamegrpvalidator,
   sendfriendrequestvalidator,
   acceptfriendrequestvalidator,
   adminloginvalidator
}