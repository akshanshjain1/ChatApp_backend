import { userSocketIds } from "../app.js"
import { Chat } from "../modals/chat.modal.js";
import { User } from "../modals/user.modal.js";
import jwt, { JwtPayload } from "jsonwebtoken"
interface CustomJWTPayload extends JwtPayload{
    picture:string  
}
export const  getSockets=(users:Array<any>=[])=>{
    const sockets=users.map((user)=>userSocketIds.get(user.toString()));
    return sockets;
}
export const getAnotherMember=async(ChatId:string,UserId:string)=>{
    const chat=await Chat.findById(ChatId);
    const othermember=chat?.members.filter((id)=>id.toString()!==UserId)||[];
    return othermember[0].toString();




}

export const generateUsername = (name:string):any => {
    if (!name) return null;
  
    
    let username = name.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "_");
  
    
    username += "_" + Date.now().toString().slice(-5); 
  
    return username;
  };

 export  const generateUniqueUsername = async (name:string) => {
    let baseUsername = generateUsername(name);
    let username = baseUsername;
    let counter = 1;
   
   
    while (await User.findOne({ username })) {
      username = `${baseUsername}_${counter}`;
      counter++;
    }
    
    return username;
  };


 export const decodeGoogleToken = (token:string) => {
    console.log("!",token)
    const decoded = jwt.decode(token) as CustomJWTPayload;
    console.log(decoded)
    return decoded?.picture; 
  };
export const getBase64 = (file: any): string => {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};