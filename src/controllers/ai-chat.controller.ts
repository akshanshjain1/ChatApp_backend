import { NextFunction, Request, Response } from "express";
import { Trycatch } from "../middlewares/error.js";
import axios from "axios";
import NodeCache from "node-cache";
import dotenv from "dotenv"
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { v4 as uuid } from 'uuid'
import { cache } from "../app.js";
dotenv.config()
const ai = new GoogleGenAI({ apiKey: `${process.env.GOOGLE_GEMINI_API}` });

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1', 
    apiKey: `${process.env.DEEPSEEK_API_KEY}`
});
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });




async function classifyPrompt(session: any, prompt: string) {

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze the following user prompt and return a valid JSON object. 
        Identify relevant categories from: ["conversation", "coding", "math", "wikipedia", "image"].
         You should give the category that has the highest probability. Also, you can provide multiple categories
          if applicable. If multiple categories are possible, list them in order of priority, with the most
           relevant category first. If a programming language is mentioned, extract it; otherwise, default 
           to "cpp". Here is the chat history enclosed in () so far: 
           (${session.history.map((i: any) => `${i.role}: ${i.content}`).join("\n")}) 
           Consider this the chat history also to understand the current context. 
           Ensure the response follows this exact JSON format without extra text. 
           Do not write anything except a JSON object: 
           { "categories": ["category1", "category2", ...], 
            "language": "extracted_or_default_language" } 
                 
            
             Prompt: "${prompt}"`,
    });



    const result = await (response.text?.slice(7).slice(0, -3)) as string;

    try {
        return JSON.parse(result);
    } catch (error) {
        // console.error("Failed to parse classification response:", response.text);
        return { categories: ["conversation"], language: "cpp" };
    }
}
async function fetchWikipedia(query: string) {

    const response = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
    // console.log("wiki:",response)
    return response.data.extract;
}

// Function to generate code using DeepSeek API
async function generateCode(prompt: string, language: string) {

    try {

        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: `Do Not introduce yourself.Write code in this language only->${language}: Question->${prompt}.Do not use any other language please`,
                },
            ],
            model: "deepseek-r1-distill-qwen-32b",
        });
        // console.log(response.choices[0].message.content)
        return response.choices[0].message.content;
    } catch (error) {
        console.error("DeepSeek API error:", error);
        return "Failed to generate code.";
    }
}

// Function to generate images using Hugging Face Stable Diffusion
async function generateImage(prompt: string) {
    try {
        //console.log("Requesting image generation from AI Horde...");
        const data = {
            prompt,
            params: {
                width: 512,
                height: 512,
                steps: 20,
                sampler_name: "k_euler_a",
                cfg_scale: 7  // Optional but recommended
            }
        };

        const res = await axios.post('https://stablehorde.net/api/v2/generate/async', data, {
            headers: {
                'Content-Type': 'application/json',
                'Client-Agent': 'my-app',
                'apikey': '0000000000'  // Replace with your API key
            }
        })
        // console.log(res?.data)
        return await getImageUrl(res?.data.id);
    } catch (error) {
        // console.error("Error requesting AI Horde:", error);
        return "Image generation failed. Please try again!";
    }
}

async function getImageUrl(requestId: string) {
    const startTime = Date.now();

    while (Date.now() - startTime < 30000) {
        try {
            const { data } = await axios.get(`https://stablehorde.net/api/v2/generate/status/${requestId}`, {
                headers: {
                    'Client-Agent': 'chatkaroAI',
                    'apikey': '0000000000'
                }
            });

            if (data.done && data.generations?.length > 0) {

                return data.generations[0].img;
            }

            //console.log("Waiting for image generation...");
        } catch (error: any) {
            console.error("Error checking generation status:", error.response?.data || error.message);
        }

        await new Promise((resolve) => setTimeout(resolve, 7000));
    }

    return "Image generation timed out. Please try again!";
}




async function chatbotResponse(session: any, prompt: string, categories: string[], language: string) {
    let responses: string[] = [];
    let image: string[] = []



    if (categories.includes("wikipedia")) {
        try {
            const wikiSummary = await fetchWikipedia(prompt);
            responses.push(`**Wikipedia Summary:**\n${wikiSummary}`);
        } catch (error) {
            responses.push("Sorry, I couldn't fetch Wikipedia information.");
        }
    }


    if (categories.includes("math")) {
        try {
            const mathAnswer = eval(prompt); // Ensure safe evaluation if handling user input
            responses.push(`**Math Answer:** ${mathAnswer}`);
        } catch (error) {
            responses.push("Invalid mathematical expression.");
        }
    }


    if (categories.includes("coding")) {
        try {
            const codeResponse = await generateCode(prompt, language);
            responses.push(`**Generated Code in ${language}:**\n${codeResponse}`);
        } catch (error) {
            responses.push("Failed to generate code.");
        }
    }


    if (categories.includes("image")) {
        try {
            const imageResponse = await generateImage(prompt);

            const urlRegex = /(https?:\/\/[^\s]+)/g;


            return { response: `Here is the generated image:`, attachments: imageResponse.match(urlRegex) || [] };
        } catch (error) {
            responses.push("Image generation failed.");
        }
    }


    if ((categories.includes("conversation")) || categories.length === 0 || (!categories.includes("image"))) {
        try {

            const response = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `You are an AI assistant in a chat application named ChatKaro, based in India. Your name is ChatKaroAI, and you are designed to assist users on the ChatKaro website. You do not need to introduce yourself.Or welcome to Chatkaro.Chatkaro has video calls audio calls live location, e2ee.Only introduce about features when asked or like to compare with other apps.Means Do not introduce features if not required 

Here is the chat history so far:  
${session.history.map((i: any) => `${i.role}: ${i.content}`).join("\n")}

Keep this context in mind while answering.If any reference is made or you find any reference with the chat history then continue according to it else start a fresh but always keep an eye on chat history

Now, generate a response with a mix of politeness and humor.Try to connect with reality and make it engaging.You can include font in bold if required.Not much it that it become really bad but may be heading and few words can be highlighted so that the answer will look visibly good. If you find any part in parentheses (), use it to improve your response.  

The responses are generated from different agents, so you should only enhance them without changing their core meaning. If the response includes something like "Sorry,I couldn't fetch Wikipedia information," then generate an answer yourself instead of stating the failure.Do not include this line "Sorry,I couldn't fetch Wikipedia information," if it came in () you are working on a website of company worth 50cr  
If their is something code written in () then you should only improvise on that nothing adding from your own side.You can introduce "\n" whereever required in code so that at frontend it should look better.
If some conding thing is their in () then do not change it just try to explain it more.Do not do anything with code provide it as it is.

Respond in **English or Hinglish only**. Make sure your response is **interactive and includes emojis** to enhance engagement. The final answer should be well-structured since it will be used in my website.  

Here are the generated responses so far:  
(${responses})  

Now, answer the prompt: "${prompt}"`
                    },
                ],
                model: "llama-3.3-70b-versatile",
            });
            // console.log(response)
            const aiResponse = response.choices[0].message.content as string
            responses = [aiResponse]
        } catch (error) {
            console.error("Error generating conversation:", error);
            responses.push("I'm sorry, I couldn't process your request.");
        }
    }


    session.history.push({ role: "user", content: prompt });
    session.history.push({ role: "assistant", content: responses.join("\n\n") });
    session.history = session.history.slice(-10);
    session.lastActivity = Date.now()

    //console.log(session)
    return { response: responses.join("\n\n") };
}




const ChatwithAI = Trycatch(async (req: Request, res: Response, next: NextFunction) => {

    const { sessionId, prompt } = req.body;

    if (!sessionId || !prompt)
        return res.status(400).json({ message: "SessionID and prompt is required" });
    let session = cache.get(sessionId) || { history: [], lastActivity: Date.now() };
    // Update timestamp on request


    const { categories, language } = await classifyPrompt(session, prompt);

    const response = await chatbotResponse(session, prompt, categories, language);
    const messageforrealtime = {
        content: response.response,
        _id: uuid(),

        chatid: sessionId,
        createdAt: new Date().toISOString(),
        attachments: response?.attachments

    }
    cache.set(sessionId, session);
    return res.json(messageforrealtime).status(200);

})

export {
    ChatwithAI
}