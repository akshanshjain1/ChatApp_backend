
class Errorhandler extends Error{
    public path?:string
    constructor(public message:string,public statuscode:number,public data:any={}){
        
        super(message);
        this.statuscode=statuscode
        this.data=message
       
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export default Errorhandler