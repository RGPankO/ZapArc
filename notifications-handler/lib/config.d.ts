/**
 * Configuration module with environment validation
 */
import 'dotenv/config';
import { z } from 'zod';
/**
 * Configuration schema with validation and defaults
 */
declare const configSchema: z.ZodObject<{
    /** Expo Push API endpoint URL */
    EXPO_PUSH_API_URL: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    EXPO_PUSH_API_URL: string;
}, {
    EXPO_PUSH_API_URL?: string | undefined;
}>;
/**
 * Parsed and validated configuration
 * Fails fast at startup if configuration is invalid
 */
export declare const config: {
    EXPO_PUSH_API_URL: string;
};
export type Config = z.infer<typeof configSchema>;
export {};
//# sourceMappingURL=config.d.ts.map