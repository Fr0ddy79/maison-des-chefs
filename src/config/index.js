"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
exports.config = {
    port: parseInt(process.env.PORT || '3000'),
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },
    databaseUrl: process.env.DATABASE_URL || './data/maison.db',
    nodeEnv: process.env.NODE_ENV || 'development',
};
