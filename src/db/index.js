"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var better_sqlite3_1 = require("better-sqlite3");
var better_sqlite3_2 = require("drizzle-orm/better-sqlite3");
var index_js_1 = require("../config/index.js");
var schema = require("./schema.js");
var sqlite = new better_sqlite3_1.default(index_js_1.config.databaseUrl);
exports.db = (0, better_sqlite3_2.drizzle)(sqlite, { schema: schema });
