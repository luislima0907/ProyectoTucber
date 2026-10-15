import UserRepository from '../modules/users/user_repository.js'
import UserController from '../modules/users/user_controller.js'
import UserService from '../modules/users/user_service.js'



export const modules = [
    {
        "controller": UserController,
        "service": UserService,
        "repository": UserRepository
    }
]