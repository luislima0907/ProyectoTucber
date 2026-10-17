export default class UserService{

    constructor(userRepository){
        this.userRepository = userRepository
    }

    async getAllUsers(){
      
       const users = await this.userRepository.findAll()
        if (!users){
                throw Error("Users not found")
            }

            return users

      
    
    
    }

    async createUser(user){
           if( await this.userRepository.create(user)){
                return true
           };
           return false
    }

    async findUserByCorreo(correo){
        return await this.userRepository.findByCorreo(correo)
    }
}