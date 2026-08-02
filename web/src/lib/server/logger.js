/**
 * Logger — Pino
 * Structured JSON logging untuk production, pretty print untuk dev.
 */
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev ? {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' }
    }
  } : {
    // Production: JSON logs (readable by Datadog, Logtail, CloudWatch, dll)
    formatters: {
      level: (label) => ({ level: label })
    }
  })
});

// Child loggers per modul — tambah context otomatis
export const log = {
  auth:     logger.child({ module: 'auth' }),
  pos:      logger.child({ module: 'pos' }),
  finance:  logger.child({ module: 'finance' }),
  hr:       logger.child({ module: 'hr' }),
  crm:      logger.child({ module: 'crm' }),
  scm:      logger.child({ module: 'scm' }),
  email:    logger.child({ module: 'email' }),
  ai:       logger.child({ module: 'ai' }),
  socket:   logger.child({ module: 'socket' }),
  planning: logger.child({ module: 'planning' }),
  api:      logger.child({ module: 'api' }),
  product:  logger.child({ module: 'product' }),
  business: logger.child({ module: 'business' }),
};
