import express, { NextFunction, request, Request, Response, urlencoded } from "express"
import dotenv from 'dotenv'
import { connectdb } from "./utils/features.js"
import { errorMiddleware } from "./middlewares/error.js"
import cors from 'cors'
import cookieParser from 'cookie-parser'
import  {ExtendedError, Server, Socket} from 'socket.io'
import { createServer, IncomingMessage } from "http"
import {v4 as uuid} from 'uuid'
import { corsoption } from "./constants/config.js"
import { auth, requiresAuth } from 'express-openid-connect';
import { fileURLToPath } from "url"
import path from "path"
dotenv.config({
    path: './.env'
})


connectdb()


const port: number = parseInt(process.env.PORT || "3000", 10)
export const envmode=process.env.NODE_ENV?.trim()||"PRODUCTION"

const userSocketIds=new Map()
const SocketToUserId=new Map()
const onlineusers=new Set()
const app = express()
const server=createServer(app);
const io=new Server(server,{
    cors:corsoption
})
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/public', express.static(path.join(__dirname, 'public','temp')));
app.set("io",io)
app.use(cors(corsoption ))
app.use(express.json())
app.use(cookieParser())




import userrouter from './routes/user.route.js'
import chatrouter from './routes/chat.route.js'
import adminrouter from './routes/admin.route.js'
import { CALL_ACCEPTED, CALL_CUT, CALL_REJECTED, CALLING, CHAT_JOINED, CHAT_LEAVED, ICE_CANDIDATE, NEW_MESSAGE, NEW_MESSAGES_ALERT, OFFER_ACCEPTED, ONLINE_USERS, PEER_NEGOTIATION_DONE, PEER_NEGOTIATION_NEEDED, SOMEONE_CALLING, START_TYPING, STOP_TYPING, TAKE_OFFER } from "./constants/events.js"
import { getAnotherMember, getSockets } from "./lib/helper.js"
import { Message } from "./modals/message.modal.js"
import { socketauthenticator } from "./middlewares/auth.js"
import { IUser } from "./types.js"





app.use('/api/v1/user', userrouter)
app.use('/api/v1/chat', chatrouter)
app.use('/api/v1/admin',adminrouter)
io.use((socket:Socket,next: (err?: ExtendedError) => void)=>{
   const req=socket?.request ;
   const res:Response<any, Record<string, any>>={} as Response<any, Record<string, any>>
   
    cookieParser()(req as any,res,async(err)=>{
      await socketauthenticator(err,socket,next)
    })
    
})
io.on("connection",(socket)=>{
   
     const user:IUser=socket.user as IUser
    
    
     userSocketIds.set(user._id.toString(),socket.id)
     SocketToUserId.set(socket.id,user._id.toString())
    socket.on(NEW_MESSAGE,async({chatId,members,messages}:any)=>{
        
       const messageforrealtime={
        content:messages,
        _id:uuid(),
        sender:{
            _id:user._id,
            name:user.name
        },
        chatid:chatId,
        createdAt:new Date().toISOString()
       }
       const messagefordb={
        content:messages,
        sender:user._id,
        chatid:chatId

    };


    const usersocket=getSockets(members);
    io.to(usersocket).emit(NEW_MESSAGE,{
        chatId,
        message:messageforrealtime
    })
    io.to(usersocket).emit(NEW_MESSAGES_ALERT,{chatId})


    try {
        await Message.create(messagefordb)
    } catch (error) {
        console.log(error)
    }
    }
    
)
    socket.on(START_TYPING,({members,chatId})=>{
        const memberssokets=getSockets(members);
        socket.to(memberssokets).emit(START_TYPING,{chatId})
    })
    socket.on(STOP_TYPING,({members,chatId})=>{
        const memberssokets=getSockets(members);
        socket.to(memberssokets).emit(STOP_TYPING,{chatId})
    })
    

    socket.on(CHAT_JOINED,({userId,members})=>{
        onlineusers.add(userId.toString())
        const memberssokets=getSockets(members)
        io.to(memberssokets).emit(ONLINE_USERS,Array.from(onlineusers))

    })
    socket.on(CHAT_LEAVED,({userId,members})=>{
        onlineusers.delete(userId.toString())
        const memberssokets=getSockets(members)
        io.to(memberssokets).emit(ONLINE_USERS,Array.from(onlineusers))
        
    })

    socket.on(CALLING,async(data:{ChatId:string,RoomId:string,UserId:string,Name:string,type:string})=>{
        const {ChatId,UserId,Name,RoomId,type}=data;
        const AnotherMember=await getAnotherMember(ChatId,UserId)
        if(onlineusers.has(AnotherMember)){
        io.to(socket.id).emit(CALLING,{...data,Forward:true});
        io.to(userSocketIds.get(AnotherMember)).emit(SOMEONE_CALLING,{UserId,message:`${Name} is Calling You`,ChatId,ReceivingUserId:AnotherMember,RoomId:RoomId,type})
        }
        else{
            io.to(socket.id).emit(CALLING,{...data,Forward:false})
        }
    })
    socket.on(CALL_REJECTED,async({UserId,Name})=>{
       
       
        
        io.to(userSocketIds.get(UserId)).emit(CALL_REJECTED,{UserId,message:`Call Rejected by ${Name}`})    
    })

    socket.on(CALL_ACCEPTED,async({UserId,Name,CallReceivingUserId})=>{
        
       
        
        io.to(userSocketIds.get(UserId)).emit(CALL_ACCEPTED,{UserId,message:`Call Accepted by ${Name}`,CallReceivingUserId})    
    })

    socket.on(TAKE_OFFER,async({UserId,CallReceivingUserId,offer})=>{
        
        io.to(userSocketIds.get(CallReceivingUserId)).emit(TAKE_OFFER,{UserId,CallReceivingUserId,offer})
    })

    socket.on(OFFER_ACCEPTED,async({UserId,CallReceivingUserId,ans})=>{
        io.to(userSocketIds.get(UserId)).emit(OFFER_ACCEPTED,{UserId,CallReceivingUserId,ans})
    })
    socket.on(ICE_CANDIDATE,({candidate,userid})=>{
        io.to(userSocketIds.get(userid)).emit(ICE_CANDIDATE,{candidate,userid})

    })
    socket.on(PEER_NEGOTIATION_NEEDED,async({offer,OutgoingUserId,IncomingUserId})=>{
            io.to(userSocketIds.get(IncomingUserId)).emit(PEER_NEGOTIATION_NEEDED,{offer,OutgoingUserId,IncomingUserId})
    })

    socket.on(PEER_NEGOTIATION_DONE,async({ans,OutgoingUserId,IncomingUserId})=>{
        io.to(userSocketIds.get(OutgoingUserId)).emit(PEER_NEGOTIATION_DONE,{ans,OutgoingUserId,IncomingUserId})
    })

    socket.on(CALL_CUT,async({CallcutUserid,RoomId})=>{
        io.to(userSocketIds.get(CallcutUserid)).emit(CALL_CUT,{CallcutUserid,Roomid:RoomId})
    })
    socket.on('disconnect',()=>{
        
        userSocketIds.delete(user._id)
        onlineusers.delete(user._id.toString())
        socket.broadcast.emit(ONLINE_USERS,Array.from(onlineusers))
    })
})
app.use(errorMiddleware)
server.listen(port, () => {
    console.log(`server started at ${port} in ${envmode} Mode`)
})
export {userSocketIds,io}