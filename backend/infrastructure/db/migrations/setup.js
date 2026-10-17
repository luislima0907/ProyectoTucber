import { runUsers } from "./001_users_migration.js  ";
import { runConductor } from "./002_conductores_migration.js";
import { runConductoresFoto } from "./003_conductores_foto_migration.js";

export async  function runMigrations(pool){

    await runUsers(pool)
    await runConductor(pool)
    await runConductoresFoto(pool)

}