import UserRepository from '../modules/users/user_repository.js'
import UserController from '../modules/users/user_controller.js'
import UserService from '../modules/users/user_service.js'

import AuthController from '../modules/auth/auth_controller.js'
import AuthService from '../modules/auth/auth_service.js'
import AuthRepository from '../modules/auth/auth_repository.js'
import { authenticateToken } from '../middlewares/jwt_midleware.js'

export const modules = [
    {
        controller: UserController,
        service: UserService,
        repository: UserRepository,
        public: false
    },
    {    
        controller: AuthController,
        service: AuthService,
        repository: AuthRepository,
        public: true
        
    
    }
]
