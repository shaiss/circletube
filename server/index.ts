import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDbConnection } from "./db";
import { apiRequestLogger } from "./requestLogger";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request log: method, path, status and duration only. Bodies and headers are not logged.
app.use(apiRequestLogger(log));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

(async () => {
  try {
    // Test database connection on startup
    console.log("Testing database connection...");
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      console.error("ERROR: Could not connect to the database. Please check your database credentials.");
      console.log("Attempting to continue despite database connection issues...");
    }
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`Error handling request:`, err);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Railway (and similar hosts) inject PORT; fall back to 5000 for local prod runs.
    const port = Number(process.env.PORT) || 5000;

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use.`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    // Bind all interfaces; do not set reusePort (SO_REUSEPORT can fail on some hosts).
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();