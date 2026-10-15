export default class UserRepository{

    constructor(db){
        
    }


    async findAll(){
        const {rows:users} = await db.query("SELECT * FROM USERS")
    }
}