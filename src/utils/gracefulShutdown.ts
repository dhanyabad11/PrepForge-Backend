import { Server } from "http";
import logger from "./logger";

export class GracefulShutdown {
    private server: Server;
    private isShuttingDown = false;

    constructor(server: Server) {
        this.server = server;
        this.setupHandlers();
    }

    private setupHandlers() {
        // Handle shutdown signals
        process.on("SIGTERM", () => this.shutdown("SIGTERM"));
        process.on("SIGINT", () => this.shutdown("SIGINT"));

        // Handle uncaught errors
        process.on("uncaughtException", (error) => {
            logger.error("Uncaught Exception:", error);
            this.shutdown("UNCAUGHT_EXCEPTION");
        });

        process.on("unhandledRejection", (reason, promise) => {
            logger.error("Unhandled Rejection at:", promise, "reason:", reason);
            this.shutdown("UNHANDLED_REJECTION");
        });
    }

    private async shutdown(signal: string) {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        logger.info(`Received ${signal}, starting graceful shutdown...`);

        // Stop accepting new connections
        this.server.close(() => {
            logger.info("HTTP server closed");
        });

        // Set timeout for force shutdown
        const forceShutdownTimeout = setTimeout(() => {
            logger.error("Could not close connections in time, forcefully shutting down");
            process.exit(1);
        }, 30000); // 30 seconds

        try {
            // Wait for ongoing requests to finish
            await this.waitForConnections();

            clearTimeout(forceShutdownTimeout);
            logger.info("Graceful shutdown completed");
            process.exit(0);
        } catch (error) {
            logger.error("Error during shutdown:", error);
            process.exit(1);
        }
    }

    private waitForConnections(): Promise<void> {
        return new Promise((resolve) => {
            // Check if there are any active connections
            const checkConnections = () => {
                this.server.getConnections((err, count) => {
                    if (err) {
                        logger.error("Error getting connections:", err);
                        resolve();
                        return;
                    }

                    if (count === 0) {
                        resolve();
                    } else {
                        logger.info(`Waiting for ${count} connections to close...`);
                        setTimeout(checkConnections, 1000);
                    }
                });
            };

            checkConnections();
        });
    }
}
