import { CorsOptions } from "cors"

const corsoption:CorsOptions={
    origin:[
        "http://localhost:5173",
        "http://localhost:4173",
        process.env.CLIENT_URL||""
    ],
    credentials:true
}
export {corsoption}