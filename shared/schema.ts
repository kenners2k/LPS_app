import { pgTable, text, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
});

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull(),
  number: integer("number").notNull(),
  isActive: boolean("is_active").notNull().default(false),
}, (t) => ({
  unq: unique().on(t.seasonId, t.number),
}));

export const gameWeeks = pgTable("game_weeks", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  number: integer("number").notNull(),
  deadline: timestamp("deadline").notNull(),
  isActive: boolean("is_active").notNull().default(false),
}, (t) => ({
  unq: unique().on(t.roundId, t.number),
}));

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  short_name: text("short_name"),
  tla: text("tla"),
  crest: text("crest"),
});

export const fixtures = pgTable("fixtures", {
  id: serial("id").primaryKey(),
  external_id: integer("external_id").unique(),  // Changed from externalId to external_id to match PostgreSQL convention
  game_week_id: integer("game_week_id"),
  home_team_id: integer("home_team_id").notNull(),
  away_team_id: integer("away_team_id").notNull(),
  home_score: integer("home_score"),
  away_score: integer("away_score"),
  kickoff: timestamp("kickoff").notNull(),
  status: text("status").notNull().default('SCHEDULED'),
  selected: boolean("selected").notNull().default(false),
  winner: text("winner"),
  external_season_id: integer("external_season_id"),  // Renamed from season_id
  season_id: integer("season_id").notNull(),  // Internal season reference
  round_id: integer("round_id"),  // Added placeholder for round_id
});

export const picks = pgTable("picks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id").notNull(),
  // Game week, round, and season data
  gameWeekId: integer("game_week_id").notNull(),
  roundId: integer("round_id").notNull(),
  seasonId: integer("season_id").notNull(),
  // Fixture data
  fixtureId: integer("fixture_id").notNull(),
  externalId: integer("external_id"),
  isHomeTeam: boolean("is_home_team").notNull(),
  // Result data
  isCorrect: boolean("is_correct"),
  pickedAt: timestamp("picked_at").notNull().defaultNow(),
}, (t) => ({
  unq: unique().on(t.userId, t.gameWeekId),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSeasonSchema = createInsertSchema(seasons)
  .extend({
    startDate: z.string().transform((date) => new Date(date)),
    endDate: z.string().transform((date) => new Date(date)),
  })
  .omit({ id: true });
export const insertRoundSchema = createInsertSchema(rounds)
  .extend({
    number: z.number().or(z.string().transform(val => parseInt(val, 10))),
  })
  .omit({ id: true });
export const insertGameWeekSchema = createInsertSchema(gameWeeks)
  .extend({
    number: z.number().or(z.string().transform(val => parseInt(val, 10))),
    deadline: z.string().transform((date) => {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date format');
      }
      return parsedDate;
    }),
  })
  .omit({ id: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertFixtureSchema = createInsertSchema(fixtures).omit({ id: true });
export const insertPickSchema = createInsertSchema(picks).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Season = typeof seasons.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type GameWeek = typeof gameWeeks.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Fixture = typeof fixtures.$inferSelect;
export type Pick = typeof picks.$inferSelect;

// Add interface for current active data
export interface CurrentData {
  season?: Season;
  round?: Round;
  gameWeek?: GameWeek;
}