export default class UserService{

    constructor(userRepository){
        this.userRepository
    }

    async getAllUsers(){
      
        const users = await this.userRepository.findAll()
        if (!users){
                throw Error("Users not found")
            }

            return users

      
    
    
    }
}