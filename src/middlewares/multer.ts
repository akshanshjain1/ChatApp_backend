import multer, { Options } from 'multer'
// export const multerupload=multer({limits:{
//     fieldSize:1024*1024*5
// }} as Options)
const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./public/temp')
    },
    filename:function(req,file,cb){
        cb(null,file.originalname)
    }
})
 const multerupload=multer({
    storage:storage
})
const singleavatar=multerupload.single('avatar')

const attachments=multerupload.array("files",5)
export {singleavatar,attachments}