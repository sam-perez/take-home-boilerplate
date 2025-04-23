import { db } from "./db/knex";
import { makeApp } from "./rest-api";
import dotenv from "dotenv";
dotenv.config();

makeApp(db);
