"use strict";
/**
 * Configuration module with environment validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
const zod_1 = require("zod");
/**
 * Configuration schema with validation and defaults
 */
const configSchema = zod_1.z.object({
    /** Expo Push API endpoint URL */
    EXPO_PUSH_API_URL: zod_1.z
        .string()
        .url()
        .default('https://exp.host/--/api/v2/push/send'),
});
/**
 * Parsed and validated configuration
 * Fails fast at startup if configuration is invalid
 */
exports.config = configSchema.parse({
    EXPO_PUSH_API_URL: process.env.EXPO_PUSH_API_URL,
});
//# sourceMappingURL=config.js.map