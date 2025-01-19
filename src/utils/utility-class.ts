
class Errorhandler extends Error{
    public path?:string
    constructor(public message:string,public statuscode:number,public data:object={}){
        super(message);
        this.statuscode=statuscode
        this.data=data
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export default Errorhandler