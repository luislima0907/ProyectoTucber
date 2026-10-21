import ViajeController from '../modules/viajes/viaje_controller.js'
import ViajeService from '../modules/viajes/viaje_service.js'
import ViajeRepository from '../modules/viajes/viaje_repository.js'

import AuthController from '../modules/auth/auth_controller.js'
import AuthService from '../modules/auth/auth_service.js'
import AuthRepository from '../modules/auth/auth_repository.js'

import DriverController from '../modules/drivers/driver_controller.js'
import DriverService from '../modules/drivers/driver_service.js'
import DriverRepository from '../modules/drivers/driver_repository.js'
import TarifaController from '../modules/tarifas/tarifa_controller.js'
import TarifaService from '../modules/tarifas/tarifa_service.js'
import SolicitudController from '../modules/solicitudes/solicitud_controller.js'
import SolicitudService from '../modules/solicitudes/solicitud_service.js'
import SolicitudRepository from '../modules/solicitudes/solicitud_repository.js'

export const modules = [
    { controller: ViajeController, service: ViajeService, repository: ViajeRepository },
    {
        controller: AuthController,
        service: AuthService,
        repository: AuthRepository,
        public: true,
    },
    {
        controller: DriverController,
        service: DriverService,
        repository: DriverRepository,
        public: false,
    },
    {
        controller: TarifaController,
        service: TarifaService,
        repository: null,
        public: false,
    },
    {
        controller: SolicitudController,
        service: SolicitudService,
        repository: SolicitudRepository,
        public: false,
    },
]
