import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { IStorage } from "./types";
import session from "express-session";
import connectPg from "connect-pg-simple";
import {
  users, seasons, rounds, gameWeeks, teams, fixtures, picks,
  type User, type Season, type Round, type GameWeek, type Team, type Fixture, type Pick,
  type InsertUser
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export class DatabaseStorage implements IStorage {
  private db;
  sessionStore: session.Store;

  constructor() {
    this.db = drizzle(pool);
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const results = await this.db.insert(users).values(user).returning();
    return results[0];
  }

  // Season methods
  async getActiveSeason(): Promise<Season | undefined> {
    const results = await this.db.select().from(seasons).where(eq(seasons.isActive, true));
    return results[0];
  }

  async createSeason(season: Omit<Season, "id">): Promise<Season> {
    const results = await this.db.insert(seasons).values(season).returning();
    return results[0];
  }

  async getAllSeasons(): Promise<Season[]> {
    return await this.db.select().from(seasons);
  }

  async setActiveSeason(id: number): Promise<void> {
    const season = await this.db.select().from(seasons).where(eq(seasons.id, id)).then(rows => rows[0]);
    if (!season) throw new Error("Season not found");

    await this.db.transaction(async (tx) => {
      // First deactivate all seasons
      await tx.update(seasons).set({ isActive: false });

      // Then activate only the selected season
      await tx.update(seasons).set({ isActive: true }).where(eq(seasons.id, id));

      // Deactivate all rounds and game weeks as they're no longer valid
      await tx.update(rounds).set({ isActive: false });
      await tx.update(gameWeeks).set({ isActive: false });

      // Find the first round in this season and activate it
      const [firstRound] = await tx
        .select()
        .from(rounds)
        .where(eq(rounds.seasonId, id))
        .orderBy(rounds.number);

      if (firstRound) {
        await tx.update(rounds)
          .set({ isActive: true })
          .where(eq(rounds.id, firstRound.id));

        // Find the first game week in this round and activate it
        const [firstGameWeek] = await tx
          .select()
          .from(gameWeeks)
          .where(eq(gameWeeks.roundId, firstRound.id))
          .orderBy(gameWeeks.number);

        if (firstGameWeek) {
          await tx.update(gameWeeks)
            .set({ isActive: true })
            .where(eq(gameWeeks.id, firstGameWeek.id));
        }
      }
    });
  }

  // Round methods
  async getActiveRound(seasonId: number): Promise<Round | undefined> {
    const results = await this.db.select().from(rounds)
      .where(and(eq(rounds.seasonId, seasonId), eq(rounds.isActive, true)));
    return results[0];
  }

  async createRound(round: Omit<Round, "id">): Promise<Round> {
    const results = await this.db.insert(rounds).values(round).returning();
    return results[0];
  }

  async getAllRounds(): Promise<Round[]> {
    return await this.db.select().from(rounds);
  }

  async setActiveRound(id: number): Promise<void> {
    const round = await this.db.select().from(rounds).where(eq(rounds.id, id)).then(rows => rows[0]);
    if (!round) throw new Error("Round not found");

    await this.db.transaction(async (tx) => {
      // First deactivate ALL rounds across ALL seasons
      await tx.update(rounds).set({ isActive: false });

      // Then activate only the selected round
      await tx.update(rounds).set({ isActive: true }).where(eq(rounds.id, id));

      // Deactivate all game weeks first
      await tx.update(gameWeeks).set({ isActive: false });

      // Find and activate the first game week in this round
      const [firstGameWeek] = await tx
        .select()
        .from(gameWeeks)
        .where(eq(gameWeeks.roundId, id))
        .orderBy(gameWeeks.number);

      if (firstGameWeek) {
        await tx.update(gameWeeks)
          .set({ isActive: true })
          .where(eq(gameWeeks.id, firstGameWeek.id));
      }
    });
  }

  // Game week methods
  async getActiveGameWeek(roundId: number): Promise<GameWeek | undefined> {
    const results = await this.db.select().from(gameWeeks)
      .where(and(eq(gameWeeks.roundId, roundId), eq(gameWeeks.isActive, true)));
    return results[0];
  }

  async createGameWeek(gameWeek: Omit<GameWeek, "id">): Promise<GameWeek> {
    const results = await this.db.insert(gameWeeks).values(gameWeek).returning();
    return results[0];
  }

  async getAllGameWeeks(): Promise<GameWeek[]> {
    return await this.db.select().from(gameWeeks);
  }

  async setActiveGameWeek(id: number): Promise<void> {
    const gameWeek = await this.db.select().from(gameWeeks).where(eq(gameWeeks.id, id)).then(rows => rows[0]);
    if (!gameWeek) throw new Error("Game week not found");

    await this.db.transaction(async (tx) => {
      // First deactivate ALL game weeks
      await tx.update(gameWeeks).set({ isActive: false });

      // Then activate only the selected game week
      await tx.update(gameWeeks)
        .set({ isActive: true })
        .where(eq(gameWeeks.id, id));
    });
  }

  // Team methods
  async getTeams(): Promise<Team[]> {
    return await this.db.select().from(teams);
  }

  async createTeam(team: Omit<Team, "id">): Promise<Team> {
    const results = await this.db.insert(teams).values(team).returning();
    return results[0];
  }

  async updateTeam(id: number, teamData: Partial<Omit<Team, "id" | "name">>): Promise<Team> {
    const results = await this.db
      .update(teams)
      .set(teamData)
      .where(eq(teams.id, id))
      .returning();
    return results[0];
  }

  // Fixture methods
  async getFixturesByGameWeek(gameWeekId: number): Promise<Fixture[]> {
    return await this.db.select().from(fixtures).where(eq(fixtures.game_week_id, gameWeekId));
  }
  
  async getFixturesByGameWeekWithTeams(gameWeekId: number): Promise<any[]> {
    const query = `
      SELECT 
        f.*,
        home_team.id as home_team_id,
        home_team.name as home_team_name,
        home_team.tla as home_team_tla,
        home_team.crest as home_team_crest,
        away_team.id as away_team_id,
        away_team.name as away_team_name,
        away_team.tla as away_team_tla,
        away_team.crest as away_team_crest
      FROM fixtures f
      LEFT JOIN teams home_team ON f.home_team_id = home_team.id
      LEFT JOIN teams away_team ON f.away_team_id = away_team.id
      WHERE f.game_week_id = $1
      ORDER BY f.kickoff ASC
    `;

    const result = await pool.query(query, [gameWeekId]);

    return result.rows.map(row => ({
      id: row.id,
      kickoff: row.kickoff,
      status: row.status,
      home_score: row.home_score,
      away_score: row.away_score,
      gameWeekId: row.game_week_id,
      homeTeam: {
        id: row.home_team_id,
        name: row.home_team_name,
        tla: row.home_team_tla,
        crest: row.home_team_crest,
      },
      awayTeam: {
        id: row.away_team_id,
        name: row.away_team_name,
        tla: row.away_team_tla,
        crest: row.away_team_crest,
      }
    }));
  }

  async createFixture(fixture: Omit<Fixture, "id">): Promise<Fixture> {
    const results = await this.db.insert(fixtures).values(fixture).returning();
    return results[0];
  }

  // Pick methods
  async createPick(pick: Omit<Pick, "id">): Promise<Pick> {
    const results = await this.db.insert(picks).values(pick).returning();
    return results[0];
  }

  async getPicksByGameWeek(gameWeekId: number): Promise<Pick[]> {
    return await this.db.select().from(picks).where(eq(picks.gameWeekId, gameWeekId));
  }

  async getPicksByUser(userId: number): Promise<Pick[]> {
    return await this.db.select().from(picks).where(eq(picks.userId, userId));
  }

  async createOrUpdateFixture(fixture: Omit<Fixture, "id"> & { external_id: number }): Promise<Fixture> {
    // Check if fixture already exists
    const existingFixture = await this.db
      .select()
      .from(fixtures)
      .where(eq(fixtures.external_id, fixture.external_id))
      .then(rows => rows[0]);

    if (existingFixture) {
      // Update existing fixture but preserve game_week_id, round_id, and season_id
      const results = await this.db
        .update(fixtures)
        .set({
          // Don't update these fields to preserve game week assignments
          // game_week_id: fixture.game_week_id,
          // round_id: fixture.round_id,
          // season_id: fixture.season_id,
          
          // Only update the match data
          home_team_id: fixture.home_team_id,
          away_team_id: fixture.away_team_id,
          home_score: fixture.home_score,
          away_score: fixture.away_score,
          kickoff: fixture.kickoff,
          status: fixture.status,
          selected: fixture.selected,
          winner: fixture.winner,
          external_season_id: fixture.external_season_id,
        })
        .where(eq(fixtures.external_id, fixture.external_id))
        .returning();
      return results[0];
    } else {
      // Create new fixture
      const results = await this.db
        .insert(fixtures)
        .values(fixture)
        .returning();
      return results[0];
    }
  }

  async getAllFixturesWithTeams(): Promise<any[]> {
    // Use SQL query to properly join with teams table twice
    const query = `
      SELECT 
        f.*,
        home_team.id as home_team_id,
        home_team.name as home_team_name,
        home_team.tla as home_team_tla,
        home_team.crest as home_team_crest,
        away_team.id as away_team_id,
        away_team.name as away_team_name,
        away_team.tla as away_team_tla,
        away_team.crest as away_team_crest
      FROM fixtures f
      LEFT JOIN teams home_team ON f.home_team_id = home_team.id
      LEFT JOIN teams away_team ON f.away_team_id = away_team.id
    `;

    const result = await pool.query(query);

    // Transform the raw results into the expected format
    return result.rows.map(row => ({
      id: row.id,
      external_id: row.external_id,
      home_team_id: row.home_team_id,
      away_team_id: row.away_team_id,
      home_score: row.home_score,
      away_score: row.away_score,
      kickoff: row.kickoff,
      status: row.status,
      selected: row.selected,
      winner: row.winner,
      season_id: row.season_id,
      gameWeekId: row.game_week_id,
      homeTeam: {
        id: row.home_team_id,
        name: row.home_team_name,
        tla: row.home_team_tla,
        crest: row.home_team_crest,
      },
      awayTeam: {
        id: row.away_team_id,
        name: row.away_team_name,
        tla: row.away_team_tla,
        crest: row.away_team_crest,
      }
    }));
  }

  async getUnassignedFixturesBySeasonId(seasonId: number): Promise<any[]> {
    // Use SQL query to properly join with teams table twice
    const query = `
      SELECT 
        f.*,
        home_team.id as home_team_id,
        home_team.name as home_team_name,
        home_team.tla as home_team_tla,
        home_team.crest as home_team_crest,
        away_team.id as away_team_id,
        away_team.name as away_team_name,
        away_team.tla as away_team_tla,
        away_team.crest as away_team_crest
      FROM fixtures f 
      LEFT JOIN teams home_team ON f.home_team_id = home_team.id
      LEFT JOIN teams away_team ON f.away_team_id = away_team.id
      WHERE f.season_id = $1 
      AND (f.game_week_id IS NULL OR f.game_week_id = 0)
      ORDER BY f.kickoff ASC
    `;

    console.log('Executing query with seasonId:', seasonId);
    const result = await pool.query(query, [seasonId]);
    console.log('Query result rows:', result.rows.length);

    return result.rows.map(row => ({
      id: row.id,
      external_id: row.external_id,
      utcDate: row.kickoff,
      status: row.status,
      selected: false,
      homeTeam: {
        id: row.home_team_id,
        name: row.home_team_name,
        tla: row.home_team_tla,
        crest: row.home_team_crest,
      },
      awayTeam: {
        id: row.away_team_id,
        name: row.away_team_name,
        tla: row.away_team_tla,
        crest: row.away_team_crest,
      }
    }));
  }

  async updateFixturesGameWeek(fixtureIds: number[], gameWeekId: number, roundId: number, seasonId: number): Promise<void> {
    const query = `
      UPDATE fixtures 
      SET game_week_id = $1,
          round_id = $2,
          season_id = $3
      WHERE id = ANY($4)
    `;

    await pool.query(query, [gameWeekId, roundId, seasonId, fixtureIds]);
  }

  async getGameWeeksByRound(roundId: number): Promise<GameWeek[]> {
    return await this.db.select().from(gameWeeks).where(eq(gameWeeks.roundId, roundId));
  }

  async getPicksByGameWeeks(userId: number, gameWeekIds: number[]): Promise<Pick[]> {
    // Use a raw SQL query to avoid the column name mismatch issue
    const query = `
      SELECT id, user_id as "userId", game_week_id as "gameWeekId", team_id as "teamId", is_correct as "isCorrect" 
      FROM picks 
      WHERE user_id = $1 AND game_week_id = ANY($2)
    `;
    
    const result = await pool.query(query, [userId, gameWeekIds]);
    return result.rows;
  }
  
  async getFixtureById(fixtureId: number): Promise<Fixture | undefined> {
    const [fixture] = await this.db.select().from(fixtures).where(eq(fixtures.id, fixtureId));
    return fixture;
  }
}

export const storage = new DatabaseStorage();