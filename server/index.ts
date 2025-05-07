import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";
import 'dotenv/config';
console.log("Connecting to database with URL:", process.env.DATABASE_URL);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Set up database and run schema push
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Test database connection
  try {
    await pool.query("SELECT 1");
    log("Database connection successful");
  } catch (error) {
    log("Database connection failed:", error);
    process.exit(1);
  }

  const db = drizzle(pool, { schema });

  try {
    log("Pushing schema to database...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS seasons (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS rounds (
        id SERIAL PRIMARY KEY,
        season_id INTEGER NOT NULL,
        number INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS game_weeks (
        id SERIAL PRIMARY KEY,
        round_id INTEGER NOT NULL,
        number INTEGER NOT NULL,
        deadline TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS fixtures (
        id SERIAL PRIMARY KEY,
        external_id INTEGER UNIQUE,
        game_week_id INTEGER,
        round_id INTEGER,
        season_id INTEGER NOT NULL,
        home_team_id INTEGER NOT NULL,
        away_team_id INTEGER NOT NULL,
        home_score INTEGER,
        away_score INTEGER,
        kickoff TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        selected BOOLEAN NOT NULL DEFAULT FALSE,
        winner TEXT
      );

      CREATE TABLE IF NOT EXISTS picks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        game_week_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        is_correct BOOLEAN,
        picked_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, game_week_id)
      );
    `);
    log("Schema push completed successfully");
  } catch (error) {
    log("Error pushing schema:", error);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 3000;
  server.listen(port, () => {
    log(`Server running at http://localhost:${port}`);
  });
})();