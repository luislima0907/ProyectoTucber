import { runUsers } from "./001_users_migration.js  ";
import { runConductor } from "./002_conductores_migration.js";
import { runConductoresFoto } from "./003_conductores_foto_migration.js";
import { runSolicitudes } from "./004_solicitudes_migration.js";
import { runDisponibilidadConductores } from "./005_disponibilidad_conductores_migration.js";
import { runLlegadaYPin } from "./006_llegada_y_pin_migration.js";
<<<<<<< HEAD
import { runPinValidacion } from "./007_pin_validacion_migration.js";
=======
>>>>>>> 71636920aa2c9a71f3405a23bc13db1ea8ff2d8f

export async  function runMigrations(pool){

    await runUsers(pool)
    await runConductor(pool)
    await runConductoresFoto(pool)
    await runSolicitudes(pool)
    await runDisponibilidadConductores(pool)
    await runLlegadaYPin(pool)
<<<<<<< HEAD
    await runPinValidacion(pool)
=======
>>>>>>> 71636920aa2c9a71f3405a23bc13db1ea8ff2d8f

}