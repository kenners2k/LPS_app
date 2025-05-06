import type { Store } from "express-session";
import type {
  User, Season, Round, GameWeek, Team, Fixture, Pick,
  InsertUser
} from "@shared/schema";

export interface IStorage {
  sessionStore: Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Season methods
  getActiveSeason(): Promise<Season | undefined>;
  getAllSeasons(): Promise<Season[]>;
  createSeason(season: Omit<Season, "id">): Promise<Season>;
  setActiveSeason(id: number): Promise<void>;

  // Round methods
  getActiveRound(seasonId: number): Promise<Round | undefined>;
  getAllRounds(): Promise<Round[]>;
  createRound(round: Omit<Round, "id">): Promise<Round>;
  setActiveRound(id: number): Promise<void>;

  // Game week methods
  getActiveGameWeek(roundId: number): Promise<GameWeek | undefined>;
  getAllGameWeeks(): Promise<GameWeek[]>;
  createGameWeek(gameWeek: Omit<GameWeek, "id">): Promise<GameWeek>;
  setActiveGameWeek(id: number): Promise<void>;

  // Team methods
  getTeams(): Promise<Team[]>;
  createTeam(team: Omit<Team, "id">): Promise<Team>;

  // Fixture methods
  getFixturesByGameWeek(gameWeekId: number): Promise<Fixture[]>;
  createFixture(fixture: Omit<Fixture, "id">): Promise<Fixture>;

  // Pick methods
  createPick(pick: Omit<Pick, "id">): Promise<Pick>;
  getPicksByGameWeek(gameWeekId: number): Promise<Pick[]>;
  getPicksByUser(userId: number): Promise<Pick[]>;
}