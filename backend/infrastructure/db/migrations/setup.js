import { runUsers } from "./001_users_migration.js  ";
import { runConductor } from "./002_conductores_migration.js";
import { runConductoresFoto } from "./003_conductores_foto_migration.js";
import { runSolicitudes } from "./004_solicitudes_migration.js";
import { runDisponibilidadConductores } from "./005_disponibilidad_conductores_migration.js";

export async  function runMigrations(pool){

    await runUsers(pool)
    await runConductor(pool)
    await runConductoresFoto(pool)
    await runSolicitudes(pool)
    await runDisponibilidadConductores(pool)

}