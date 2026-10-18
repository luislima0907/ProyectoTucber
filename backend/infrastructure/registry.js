import UserRepository from '../modules/users/user_repository.js'
import UserController from '../modules/users/user_controller.js'
import UserService from '../modules/users/user_service.js'

import AuthController from '../modules/auth/auth_controller.js'
import AuthService from '../modules/auth/auth_service.js'
import AuthRepository from '../modules/auth/auth_repository.js'

import DriverController from '../modules/drivers/driver_controller.js'
import DriverService from '../modules/drivers/driver_service.js'
import DriverRepository from '../modules/drivers/driver_repository.js'
import TarifaController from '../modules/tarifas/tarifa_controller.js'
import TarifaService from '../modules/tarifas/tarifa_service.js'

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
        
    
    },
    {
        controller: DriverController,
        service: DriverService,
        repository: DriverRepository,
        public: false
    },
    {
        controller: TarifaController,
        service: TarifaService,
        repository: null,
        public: false
    }
]
