export const logger = {
  info: (message: string, meta?: any): void => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, meta || '');
  },
  error: (message: string, error?: any): void => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '');
  },
  warn: (message: string, meta?: any): void => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, meta || '');
  },
  debug: (message: string, meta?: any): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, meta || '');
    }
  },
};