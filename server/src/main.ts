import { db } from "./db/knex";
import { makeApp } from "./rest-api";

makeApp(db);
