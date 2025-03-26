import { NextFunction, Request, Response } from "express";
import { Trycatch } from "../middlewares/error.js";
import axios from "axios";
import NodeCache from "node-cache";
import dotenv from "dotenv"
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import {v4 as uuid} from 'uuid'
dotenv.config()
const ai = new GoogleGenAI({ apiKey: `${process.env.GOOGLE_GEMINI_API}` });

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1', // Ensure correct base URL
    apiKey: `${process.env.DEEPSEEK_API_KEY}`
});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const cache = new NodeCache({ stdTTL: 1200 });


async function classifyPrompt(prompt: string) {
    ;
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze the following user prompt and Return a valid JSON object. Identify relevant categories from: ["conversation", "coding", "math", "wikipedia", "image"]. You should give that category that can have maximum chances . also you can give multiple categories as well.In case of multiple categories possible give the category name according to priority.Like which category have maximum chances should come first.You can have any number of category from given category if u want.If a programming language is mentioned, extract it; otherwise, default to "cpp". Ensure the response follows this exact JSON format without extra text . Do not write anything just a {} and data inside this:
        
        {
          "categories": ["category1"],
          "language": "extracted_or_default_language"
        }
        
        Prompt: "${prompt}"`
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
            model: "llama-3.3-70b-versatile",
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        console.error("DeepSeek API error:", error);
        return "Failed to generate code.";
    }
}

// Function to generate images using Hugging Face Stable Diffusion
async function generateImage(prompt: string) {
  
    const response = await axios.post(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1",
        { inputs: prompt },
        { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` }, responseType: "arraybuffer" }
    );
    
    return `data:image/png;base64,${Buffer.from(response.data).toString("base64")}`;
}

// Function to handle chatbot logic
// Function to handle chatbot logic
// Function to handle chatbot logic with conversation context
// Function to handle chatbot logic with proper context
async function chatbotResponse(session: any, prompt: string, categories: string[], language: string) {
    let responses: string[] = [];
    

    // Fetch Wikipedia summary if the category includes "wikipedia"
    if (categories.includes("wikipedia")) {
        try {
            const wikiSummary = await fetchWikipedia(prompt);
            responses.push(`**Wikipedia Summary:**\n${wikiSummary}`);
        } catch (error) {
            responses.push("Sorry, I couldn't fetch Wikipedia information.");
        }
    }

    // Evaluate mathematical expressions if the category includes "math"
    if (categories.includes("math")) {
        try {
            const mathAnswer = eval(prompt); // Ensure safe evaluation if handling user input
            responses.push(`**Math Answer:** ${mathAnswer}`);
        } catch (error) {
            responses.push("Invalid mathematical expression.");
        }
    }

    // Generate code if the category includes "coding"
    if (categories.includes("coding")) {
        try {
            const codeResponse = await generateCode(prompt, language);
            responses.push(`**Generated Code in ${language}:**\n${codeResponse}`);
        } catch (error) {
            responses.push("Failed to generate code.");
        }
    }

    // Generate image if the category includes "image"
    if (categories.includes("image")) {
        try {
            const imageResponse = await generateImage(prompt);
            return { response: `Here is the generated image:`, image: imageResponse };
        } catch (error) {
            responses.push("Image generation failed.");
        }
    }

    // Conversation Handling with Context
    if ((categories.includes("conversation") && responses.length === 0) || categories.length === 0 || (!categories.includes("coding") && !categories.includes("math") && !categories.includes("image"))) {
        try {
            
            const response = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `You are an AI assistant in a chat application named ChatKaro, based in India. Your name is ChatKaroAI, and you are designed to assist users on the ChatKaro website. You do not need to introduce yourself.

Here is the chat history so far:  
${session.history.map((i: any) => `${i.role}: ${i.content}`).join("\n")}

Keep this context in mind while answering.  

Now, generate a response with a mix of politeness and humor. Try to connect with reality and make it engaging. If you find any part in parentheses (), use it to improve your response.  

The responses are generated from different agents, so you should only enhance them without changing their core meaning. If the response includes something like "I couldn't fetch Wikipedia information," then generate an answer yourself instead of stating the failure.  

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

    // Append new messages to session history
    session.history.push({ role: "user", content: prompt });
    session.history.push({ role: "assistant", content: responses.join("\n\n") });
    session.history = session.history.slice(-5);
    session.lastActivity=Date.now()
    //console.log(session)
    return { response: responses.join("\n\n") };
}




const ChatwithAI = Trycatch(async (req: Request, res: Response, next: NextFunction) => {
    
    const { sessionId, prompt } = req.body;
    
    if (!sessionId || !prompt)
        return res.status(400).json({ message: "SessionID and prompt is required" });
    let session = cache.get(sessionId) || { history: [], lastActivity: Date.now() };
 // Update timestamp on request

    
    const { categories, language } = await classifyPrompt(prompt);
    
    const response = await chatbotResponse(session, prompt, categories, language);
    const messageforrealtime={
            content:response.response,
            _id:uuid(),
            
            chatid:sessionId,
            createdAt:new Date().toISOString()
           }
    cache.set(sessionId, session);
    return res.json(messageforrealtime).status(200);

})

export {
    ChatwithAI
}