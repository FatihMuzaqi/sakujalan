export const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (message, error = null) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error ? (error.stack || error) : '');
  }
};
