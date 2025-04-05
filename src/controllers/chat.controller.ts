import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ALERT, NEW_MESSAGE, NEW_MESSAGES_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { Trycatch } from "../middlewares/error.js";
import { Chat } from "../modals/chat.modal.js";
import { Message } from "../modals/message.modal.js";
import { User } from "../modals/user.modal.js";
import { IChat, IMessage } from "../types.js";
import { deletefilesfromcloudinary, emitEvent, uploadfilesoncloudinary } from "../utils/features.js";
import Errorhandler from "../utils/utility-class.js";
import { groq } from "./ai-chat.controller.js";
import JSON5 from 'json5';

const newGrpChat = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { name, members } = req.body;

    if (members.length < 2)
        return next(new Errorhandler('Group must have atleast 3 members', 400))
    const allmembers: mongoose.Types.ObjectId[] = [...members, req.user]
    const newchat: IChat = await Chat.create({
        name, groupchat: true, members: allmembers, creater: req.user
    })
    emitEvent(req, ALERT, allmembers, `Welcome to ${name} group`)
    emitEvent(req, REFETCH_CHATS, members)
    return res.status(201).json({ success: true, message: 'Group Created Successfully' })


})

const getMyChats = Trycatch(async (req: Request, res: Response, next: NextFunction) => {

    const chats = await Chat.aggregate([
        {
            $match: {
                members: { $in: [new mongoose.Types.ObjectId(req.user)] }
            }
        },
        {
            $unwind: "$members"
        },
        {
            $lookup: {
                from: "users",
                localField: "members",
                foreignField: "_id",
                as: "members",
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                groupchat: { $first: "$groupchat" },
                members: {
                    $push: {
                        $first:
                            "$members"
                    }
                },
                avatar: {
                    $push: {
                        $first: "$members.avatar.url"
                    }
                }


            }
        },
        {
            $addFields: {
                othermember: {
                    $cond: {
                        if: "$groupchat",
                        then: [],
                        else: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$members",
                                        as: "member",
                                        cond: {
                                            $ne: ["$$member._id", new mongoose.Types.ObjectId(req.user)]
                                        }
                                    }
                                },
                                as: "member",
                                in: "$$member"
                            }
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                avatar: {
                    $cond: {
                        if: "$groupchat",
                        then: {
                            $slice: ["$avatar", 3]
                        },
                        else: {
                            $map: {
                                input: "$othermember",
                                as: "member",
                                in: "$$member.avatar.url"
                            }


                        }

                    }
                },
                chatname: {
                    $cond: {
                        if: "$groupchat",
                        then: "$name",
                        else: {
                            $first: {
                                $map: {
                                    input: "$othermember",
                                    as: "member",
                                    in: "$$member.name"
                                }

                            }
                        }
                    }
                },




            }
        },
        {
            $set: {
                name: "$chatname",
                members: {
                    $map: {
                        input: {
                            $filter: {
                                input: "$members",
                                as: "member",
                                cond: { $ne: ["$$member._id", new mongoose.Types.ObjectId(req.user)] }
                            }
                        },
                        as: "member",
                        in: "$$member._id"
                    }
                }
            }

        },
        {
            $project: {
                members: 1,
                groupchat: 1,
                _id: 1,
                name: 1,
                avatar: 1
            }
        }


    ])

    return res.status(200).json({ success: true, message: 'Fetched Chats', chats })
})

const getMyGrps = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const groups = await Chat.aggregate([{
        $match: {
            creater: new mongoose.Types.ObjectId(req.user),
            groupchat: true
        }
    },
    {
        $unwind: "$members"
    },
    {
        $lookup: {
            from: "users",
            localField: "members",
            foreignField: "_id",
            as: "members",
            pipeline: [
                {
                    $project: {
                        name: 1,
                        avatar: 1

                    }
                }
            ]

        }
    },
    {
        $group: {
            _id: "$_id",
            name: { $first: "$name" },
            groupchat: { $first: "$groupchat" },
            members: {
                $push: {
                    $first: "$members"
                }
            },
            avatar: {
                $push: {
                    $first: "$members.avatar.url"
                }
            }
        }
    }, {
        $addFields: {
            avatar: {
                $slice: ["$avatar", 3]
            }
        }
    },
    {
        $project: {
            _id: 1,
            name: 1,
            groupchat: 1,
            avatar: 1
        }
    }

    ])
    return res.status(200).json({ success: true, groups })

})

const addMembers = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { chatid, members } = req.body;
    if (!chatid)
        return next(new Errorhandler('pls give the chatid', 400))
    if (!members || members.length < 1)
        return next(new Errorhandler("Plese provide members", 400))
    const chat = await Chat.findById(chatid);
    if (!chat) {
        return next(new Errorhandler("No such chat exist", 404))
    }
    if (!chat?.groupchat)
        return next(new Errorhandler("This chat is not a group", 402));
    if (chat.creater.toString() !== req.user?.toString())
        return next(new Errorhandler("you are not allowed to add members", 403));
    const allnewmemberstoadd = members.map((i: string) => User.findById(i, "name"))
    const allnewmembers = await Promise.all(allnewmemberstoadd);
    const uniquemembers = allnewmembers.filter((i) => !chat.members.includes(i._id.toString()))
    const uniquemembersid = uniquemembers.map((i) => i._id)
    chat.members.push(...uniquemembersid);
    await chat.save();
    const allusersname = uniquemembers.map((i) => i.name).join(",");

    emitEvent(
        req,
        ALERT,
        chat.members,
        `${allusersname} has been added to group`
    );
    emitEvent(req, REFETCH_CHATS, chat.members);
    return res.status(200).json({ success: true, message: "members added successfully" })
})

const removeMember = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { chatid, userId } = req.body;
    if (!chatid || !userId) return next(new Errorhandler('missing userid or chatid', 400))
    const [chat, userthatwillberemoved] = await Promise.all([
        Chat.findById(chatid),
        User.findById(userId, "name")
    ]);


    if (!chat) {
        return next(new Errorhandler("No such chat exist", 404))
    }
    if (!chat?.groupchat)
        return next(new Errorhandler("This chat is not a group", 402));
    if (chat.creater.toString() !== req.user?.toString())
        return next(new Errorhandler("you are not allowed to add members", 403));
    if (chat.members.length <= 3) {
        return next(new Errorhandler("Group cannot have less than 3 member", 401))
    }
    const allmembers = chat.members.map((i) => i._id)
    chat.members = chat.members.filter((i) => i._id.toString() !== userId.toString());

    await chat.save()

    emitEvent(
        req,
        ALERT,
        chat.members,
        {
            chatId: chatid, message: `${userthatwillberemoved.name} ko is group se hta diya gya`
        }
    );

    emitEvent(req, REFETCH_CHATS, allmembers)

    return res.status(200).json({ success: true, message: "member removed successfully" })
})

const leavefromgrp = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const chatid = req.params.id;
    const chat = await Chat.findById(chatid);
    if (!chat)
        return next(new Errorhandler("Chat not found", 404));
    if (!chat.groupchat)
        return next(new Errorhandler("This is not a group chat", 400));
    const remainingmembers = chat.members.filter((i) => i._id.toString() !== req.user?.toString());
    if (remainingmembers.length < 3)
        return next(new Errorhandler("You cannot left from grp as it should have atleast 3 member", 401))
    if (chat.creater.toString() === req.user?.toString()) {
        const len = remainingmembers.length
        const newcreater = remainingmembers[Math.floor(Math.random() * len)]

        chat.creater = newcreater
    }
    chat.members = remainingmembers
    const [user] = await Promise.all([User.findById(req.user, "name"),
    chat.save()])
    emitEvent(
        req,
        ALERT,
        chat.members,
        {
            chatId: chatid, message: `${user.name} ne group left kar diya`

        }
    )
    return res.status(200).json({ success: true, message: "U Successfully left this Group" })

})

const sendattachments = Trycatch(async (req: Request, res: Response, next: NextFunction) => {

    const { chatid } = req.body;

    const [chat, me] = await Promise.all([Chat.findById(chatid), User.findById(req.user, "name")])

    if (!chat)
        return next(new Errorhandler("Chat not found", 404));

    const files: Array<any> = Array.isArray(req.files) ? req.files : [];


    if (files.length < 1)
        return next(new Errorhandler("Provide attachements", 400));
    if (files.length > 5)
        return next(new Errorhandler("files should be between 1-5", 400))

    const attachments: Array<any> = await uploadfilesoncloudinary(files)

    const messageforrealtime = {
        content: "", attachments, sender: {
            _id: me._id,
            name: me.name
        }, chatid
    }
    const messagefordb = {
        content: "", attachments, sender: me._id, chatid
    }
    const message = await Message.create(messagefordb)

    emitEvent(req, NEW_MESSAGE, chat.members, {
        message: messageforrealtime,
        chatid
    })
    emitEvent(req, NEW_MESSAGES_ALERT, chat.members, {
        chatId: chatid

    })

    return res.status(200).json({ success: true, message })

})

const getchatdetails = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    type chatmembers = {
        _id: mongoose.Types.ObjectId,
        name: string,
        avatar: {
            public_id: string,
            url: string
        }
    }
    if (req.query.populate === 'true') {
        const chat = await Chat.findById(req.params.id).populate("members", "name avatar");
        if (!chat)
            return next(new Errorhandler("Chat not found", 404));
        const members: chatmembers[] = chat.members.map(({ _id, name, avatar }: any) => ({ _id, name, avatar: avatar.url })) || [];
        return res.status(200).json({
            success: true,
            chat: {
                ...chat.toObject(), members
            }
        })
    }
    else {
        const chat = await Chat.findById(req.params.id);
        if (!chat)
            return next(new Errorhandler("Chat not found", 404));
        return res.status(200).json({ success: true, chat })
    }
});

const renamegroup = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const chatid = req.params.id;
    const { name } = req.body
    if (!name)
        return next(new Errorhandler("provide some name", 400))
    const chat = await Chat.findById(chatid);
    if (!chat) {
        return next(new Errorhandler("No such chat exist", 404))
    }
    if (!chat?.groupchat)
        return next(new Errorhandler("This chat is not a group", 402));
    if (chat.creater.toString() !== req.user?.toString())
        return next(new Errorhandler("you are not allowed to change name", 403));
    chat.name = name;
    await chat.save();
    emitEvent(req, REFETCH_CHATS, chat.members)
    return res.status(200).json({ success: true, message: `group name changed to ${name}` })


})

const deletechat = Trycatch(async (req: Request, res: Response, next: NextFunction) => {

    const chatid = req.params.id;
    const userid = new mongoose.Types.ObjectId(req.user)
    const chat = await Chat.findById(chatid);
    const members = chat?.members || []
    if (!chat)
        return next(new Errorhandler("Chat not found", 404));
    if (chat.groupchat && chat.creater.toString() !== req.user?.toString()) {
        return next(new Errorhandler("You are not allowed to delete group", 400));

    }
    if (!chat.groupchat && !chat.members.includes(userid))
        return next(new Errorhandler("You are not part of this", 400));


    const messagewithAttachments = await Message.find({ chatid, attachments: { $exists: true, $ne: [] } });
    const public_ids: Array<any> = [];
    messagewithAttachments.forEach((message: IMessage) => {
        message.attachments.forEach((attachment) => { public_ids.push(attachment.public_id) })
    }
    );
    await Promise.all([
        deletefilesfromcloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({ chatid })

    ])
    emitEvent(req, REFETCH_CHATS, members);
    return res.status(200).json({ success: true, message: "chat deleted successfully" })

})

const getmessages = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const chatid = req.params.id;
    const page = (req.query.page as string) || "1";
    const limit = 20;
    const requserid = req.user || ""
    const skip: number = (parseInt(page) - 1) * (limit);

    const chat = await Chat.findById(chatid);
    if (!chat) return next(new Errorhandler("Chat not found", 400))
    if (!chat.members.includes(new mongoose.Types.ObjectId(requserid)))
        return next(new Errorhandler("You are not allowed to access this", 401))

    const [messages, totalmessages] = await Promise.all([
        Message.find({ chatid: new mongoose.Types.ObjectId(chatid) })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "name")
            .lean(),
        Message.countDocuments({ chatid: new mongoose.Types.ObjectId(chatid) })
    ])

    const totalpages = Math.ceil(totalmessages / limit) || 0;

    return res.status(200).json({ success: true, messages: messages.reverse(), totalpages })


})

const GetSmartReply = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    const { conversations,sendername } = req.body;

    if (!Array.isArray(conversations) || conversations.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty conversation array.' });
    }
 
    const buildPrompt = (chatHistory: string,senderName: string) => `
      You are a smart reply suggestion assistant for **group chats**.
      
      ---
      
      👤 You are "${senderName}" — a real person participating in this conversation. The rest are other group members.
      
      ---
      
      🧠 Your Job:
      
      1. Read the **entire conversation** (latest message is at the end).
      2. Then:
         - Find the **most recent message NOT sent by You** → generate smart **replies** to it.
         - Find the **most recent message sent by You** → generate **continuations** from it.
        -If you did not found any **most recent message NOT sent by You** then **most recent message NOT sent by You** is **most recent message sent by You**
        similarly if you did not found **most recent message sent by You** then **most recent message sent by You** is **most recent message NOT sent by You**
      
      ---
      
      🎨 For both replies and continuations, generate **3 unique suggestions** for each of the following styles:
      
      - 💖 Romantic – flirty, sweet, expressive,like babu-sona types.
      - 🔥 Savage – bold, blunt, savage.
      - 🙂 Normal – simple, friendly, casual.
      - 😂 Funny – meme-worthy, Gen-Z, witty.
      - 🙃 Sarcastic – dry humor, ironic, cheeky.
      - 😎 Cool – confident, influencer-style, bold one-liners.
      - 🤬 Vulgar- raw, no-filter. Multiple **Abusive** word should be included in hinglish.
      
      ---
      
      📌 Guidelines:
      - Read the **whole conversation** for tone, context, and language (English / Hindi / Hinglish).
      - Replies should match the **emotion and language** of the message they are responding to.
      - Continuations should feel **natural**, like you're carrying your last message forward.
      - **Do NOT repeat the same suggestion across styles** — each must be clearly different and fit the tone.
      - Use Atleast One **emojis**, slang, or even **light insults** (in Savage/Funny mode) if context supports it — but keep it realistic.
      - Don’t explain anything — just output the JSON.
      
      ---
      
      📦 Response Format:
      {
        "replyTo": "<latest message from someone else or fallback>",
        "replies": {
          "romantic": ["...", "...", "..."],
          "savage": ["...", "...", "..."],
          "normal": ["...", "...", "..."],
          "funny": ["...", "...", "..."],
          "sarcastic": ["...", "...", "..."],
          "cool": ["...", "...", "..."],
          "vulgur": ["...", "...", "..."]
        },
        "continueFrom": "<latest message from You or fallback>",
        "continuations": {
          "romantic": ["...", "...", "..."],
          "savage": ["...", "...", "..."],
          "normal": ["...", "...", "..."],
          "funny": ["...", "...", "..."],
          "sarcastic": ["...", "...", "..."],
          "cool": ["...", "...", "..."],
          "vulgur": ["...", "...", "..."]
        }
      }
      
      ---
      
      💬 Chat History:
      ${chatHistory}
      
      Now analyze the chat and generate reply and continuation suggestions — making each style different, creative, and tone-accurate.
      `.trim();
    const chatHistory = conversations.map(c => `${  c.sender}: ${c.message}`).join('\n'); 
    let reply;
    try {
        const prompt = buildPrompt(chatHistory,sendername);
        const response = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a smart reply suggestion assistant for chat conversations.' },
                    { role: 'user', content: prompt },
                        ],
                    model: "llama-3.3-70b-versatile",
                    temperature:0.90,
                    });
           
        reply=JSON5.parse(response.choices[0].message.content?.replace(/^```json\s*/i, '')?.replace(/^```\s*/i, '')?.replace(/```$/, '')?.trim() as string)  
    } catch (error) {
        console.error('Smart reply generation failed:', error);
        return next(new Errorhandler("Smart Reply generation Failed",500))
    }
    
    return res.json({smartReply:reply,message:"Smart Replies generated"}).status(200);

})
export { addMembers, deletechat, getchatdetails, getmessages, getMyChats, getMyGrps, leavefromgrp, newGrpChat, removeMember, renamegroup, sendattachments, GetSmartReply };

