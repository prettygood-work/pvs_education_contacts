import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'pvs-scraper' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

// Add daily rotation if in production
if (process.env.NODE_ENV === 'production') {
  const DailyRotateFile = require('winston-daily-rotate-file');
  
  const dailyRotateFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
  });
  
  logger.add(dailyRotateFileTransport);
}

// Create child loggers for specific modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Helper functions for structured logging
export const logDistrictStart = (districtId: string, districtName: string) => {
  logger.info('District scraping started', {
    districtId,
    districtName,
    event: 'district_start',
  });
};

export const logDistrictComplete = (
  districtId: string,
  districtName: string,
  contactsFound: number,
  duration: number
) => {
  logger.info('District scraping completed', {
    districtId,
    districtName,
    contactsFound,
    duration,
    event: 'district_complete',
  });
};

export const logDistrictError = (
  districtId: string,
  districtName: string,
  error: Error | string
) => {
  logger.error('District scraping failed', {
    districtId,
    districtName,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    event: 'district_error',
  });
};

export const logScraperEvent = (event: string, data?: any) => {
  logger.info(`Scraper event: ${event}`, {
    event: `scraper_${event}`,
    ...data,
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.debug('Performance metric', {
    operation,
    duration,
    event: 'performance',
    ...metadata,
  });
};

export default logger;