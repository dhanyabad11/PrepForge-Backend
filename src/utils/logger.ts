import winston from "winston";
import path from "path";

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: "prepforge-api" },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: consoleFormat,
        }),
        // Write all logs with importance level of `error` or less to `error.log`
        new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs to combined.log
        new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
    // Don't exit on handled exceptions
    exitOnError: false,
});

// Create a stream object for Morgan
export const logStream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};

export default logger;
