import { userSocketIds } from "../app.js"
import { Chat } from "../modals/chat.modal.js";

export const  getSockets=(users:Array<any>=[])=>{
    const sockets=users.map((user)=>userSocketIds.get(user.toString()));
    return sockets;
}
export const getAnotherMember=async(ChatId:string,UserId:string)=>{
    const chat=await Chat.findById(ChatId);
    const othermember=chat?.members.filter((id)=>id.toString()!==UserId)||[];
    return othermember[0].toString();




}
export const getBase64 = (file: any): string => {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};