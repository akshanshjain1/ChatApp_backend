import { faker, simpleFaker } from "@faker-js/faker";
import { Chat } from "../modals/chat.modal.js";
import { User } from "../modals/user.modal.js";
import { Message } from "../modals/message.modal.js";

const createsinglechat=async(numchats:number)=>{
    try {
        const users=await User.find().select("_id")
        const chatpromise=[]
        
        for(let i=0;i<users.length;i++){
            for(let j=i+1;j<users.length;j++){
                chatpromise.push(
                    Chat.create({
                        name:faker.lorem.words(2),
                        members:[users[i],users[j]],
                        creater:users[j]
                    })
                )
            }
        }

        await Promise.all(chatpromise);
        console.log("chats single created"),
        process.exit()
    } catch (error) {
            console.log(error);
            process.exit(1)
    }
}

const creategroupchat=async(numchats:number)=>{
    try {
        const users=await User.find().select("_id")
        const chatpromise=[]
        for(let i=0;i<numchats;i++){
            const nummembers=simpleFaker.number.int({min:3,max:users.length})
            const members:Array<any>=[];
            for(let j=0;j<nummembers;j++){

                const randomindex=Math.floor(Math.random()*users.length);
                const randomuser=users[randomindex];
                if(!members.includes(randomuser))
                    members.push(randomuser)}

                const chat=Chat.create({
                    groupchat:true,
                    name:faker.lorem.words(1),
                    members,
                    creater:members[0]
                })
                chatpromise.push(chat)
            }
        

        await Promise.all(chatpromise);
        console.log("chats multiple created"),
        process.exit()}
     catch (error) {
            console.log(error);
            process.exit(1)
    }
}

const createmessage=async(nummessages:number)=>{
    try {
        const users=await User.find().select("_id");
        const chats=await Chat.find().select("_id");
        const messagespromise=[];
        for(let i=0;i<nummessages;i++){
            const randomuser=users[Math.floor(users.length *Math.random())];
            const randomchat=chats[Math.floor(chats.length *Math.random())];
            messagespromise.push(
                Message.create({
                    sender:randomuser,
                    chatid:randomchat,
                    content:faker.lorem.words(10),
                    
                })
            )

        }
        await Promise.all(messagespromise)
        console.log("message created successfully");
        
    } catch (error) {
        console.log(error)
    }
    finally{
        process.exit(1)
    }

}

const createmessageinachat=async(chatid:any,nummessages:number)=>{
    try {
        const users=await User.find().select("_id");
        
        const messagespromise=[];
        for(let i=0;i<nummessages;i++){
            const randomuser=users[Math.floor(users.length *Math.random())];
            const randomchat=chatid
            messagespromise.push(
                Message.create({
                    sender:randomuser,
                    chatid:randomchat,
                    content:faker.lorem.words(10),
                    
                })
            )

        }
        await Promise.all(messagespromise)
        console.log("message created successfully");
        
    } catch (error) {
        console.log(error)
    }
    finally{
        process.exit(1)
    }

}
export{createsinglechat,creategroupchat,createmessageinachat,createmessage}