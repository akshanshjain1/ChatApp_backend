import { faker, simpleFaker } from "@faker-js/faker";
import { User } from "../modals/user.modal.js";
import { UserPreferences } from "typescript";
import { Chat } from "../modals/chat.modal.js";
import { Message } from "../modals/message.modal.js";

const createuser=async(numusers:number)=>{
    try {
        const userspromise=[];
        for(let i=0;i<numusers;i++){
            const tempuser=User.create({
                name:faker.person.fullName(),
                username:faker.internet.userName(),
                bio:faker.lorem.sentence(10),
                password:'12345',
                avatar:{
                    url:faker.image.avatar(),
                    public_id:faker.system.fileName()
                }
            })
            userspromise.push(tempuser)
        }
        await Promise.all(userspromise);
        console.log(numusers ,'created')
        process.exit(1)
    } catch (error) {
        console.log(error);
        process.exit(1)
    }
}


export {createuser}