import { runUsers } from "./001_users_migration.js  ";
import { runConductor } from "./002_conductores_migration.js";

export async  function runMigrations(pool){

    runUsers(pool)
    runConductor(pool)

}