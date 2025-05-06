import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertSeasonSchema, insertGameWeekSchema, insertFixtureSchema, insertPickSchema, insertRoundSchema } from "@shared/schema";
import { fetchFixtures } from "./services/football-data";
import { format } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin routes
  app.get("/api/fixtures/available", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    try {
      const seasonId = parseInt(req.query.seasonId as string);
      if (!seasonId) {
        return res.status(400).send("Season ID is required");
      }

      // Get unassigned fixtures for the season
      const fixturesWithTeams = await storage.getUnassignedFixturesBySeasonId(seasonId);
      res.json(fixturesWithTeams);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch fixtures" });
    }
  });

  app.get("/api/teams", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }

    const teams = await storage.getTeams();
    res.json(teams);
  });

  // Get all seasons
  app.get("/api/seasons/all", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const seasons = await storage.getAllSeasons();
    res.json(seasons);
  });

  // Get all rounds
  app.get("/api/rounds/all", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const rounds = await storage.getAllRounds();
    res.json(rounds);
  });

  // Get all game weeks
  app.get("/api/game-weeks/all", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const gameWeeks = await storage.getAllGameWeeks();
    res.json(gameWeeks);
  });

  // Set active season
  app.post("/api/seasons/:id/activate", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const seasonId = parseInt(req.params.id);
    await storage.setActiveSeason(seasonId);
    res.sendStatus(200);
  });

  // Set active round
  app.post("/api/rounds/:id/activate", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const roundId = parseInt(req.params.id);
    await storage.setActiveRound(roundId);
    res.sendStatus(200);
  });

  // Set active game week
  app.post("/api/game-weeks/:id/activate", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const gameWeekId = parseInt(req.params.id);
    await storage.setActiveGameWeek(gameWeekId);
    res.sendStatus(200);
  });

  app.post("/api/seasons", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const parsed = insertSeasonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const season = await storage.createSeason({
      ...parsed.data,
      isActive: parsed.data.isActive ?? false,
    });
    res.status(201).json(season);
  });

  app.post("/api/rounds", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const parsed = insertRoundSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const round = await storage.createRound({
      ...parsed.data,
      isActive: parsed.data.isActive ?? false,
    });
    res.status(201).json(round);
  });

  app.post("/api/game-weeks", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const parsed = insertGameWeekSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      const gameWeek = await storage.createGameWeek({
        ...parsed.data,
        isActive: parsed.data.isActive ?? false,
      });

      // Update fixtures with the new game week ID
      if (req.body.fixtureIds && Array.isArray(req.body.fixtureIds)) {
        await storage.updateFixturesGameWeek(req.body.fixtureIds, gameWeek.id);
      }

      res.status(201).json(gameWeek);
    } catch (error) {
      console.error("Error creating game week:", error);
      res.status(500).json({ error: "Failed to create game week" });
    }
  });

  app.post("/api/fixtures", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const parsed = insertFixtureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const fixture = await storage.createFixture({
      ...parsed.data,
      status: parsed.data.status ?? 'SCHEDULED',
      selected: parsed.data.selected ?? false,
      homeScore: parsed.data.homeScore ?? null,
      awayScore: parsed.data.awayScore ?? null,
    });
    res.status(201).json(fixture);
  });

  // Add new route to get all fixtures with team data
  app.get("/api/fixtures/all", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    try {
      console.log('Fetching all fixtures with teams...');
      const fixturesWithTeams = await storage.getAllFixturesWithTeams();
      console.log(`Found ${fixturesWithTeams.length} fixtures`);
      res.json(fixturesWithTeams);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch fixtures" });
    }
  });

  app.post("/api/fixtures/sync", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    try {
      const { dateFrom, dateTo } = req.body;
      console.log('Syncing fixtures with date range:', { dateFrom, dateTo });

      const fixtures = await fetchFixtures(dateFrom, dateTo);
      console.log(`Received ${fixtures.length} fixtures from API`);

      // Get the active season
      const activeSeason = await storage.getActiveSeason();
      if (!activeSeason) {
        throw new Error("No active season found");
      }

      // Update or insert each fixture
      for (const fixture of fixtures) {
        // First ensure we have both teams in our database
        const homeTeam = await storage.createTeam({
          name: fixture.homeTeam.name,
          short_name: fixture.homeTeam.shortName,
          tla: fixture.homeTeam.tla,
          crest: fixture.homeTeam.crest,
        }).catch(async (err) => {
          const teams = await storage.getTeams();
          const existingTeam = teams.find(t => t.name === fixture.homeTeam.name);
          if (existingTeam) {
            return storage.updateTeam(existingTeam.id, {
              short_name: fixture.homeTeam.shortName,
              tla: fixture.homeTeam.tla,
              crest: fixture.homeTeam.crest,
            });
          }
          return existingTeam;
        });

        const awayTeam = await storage.createTeam({
          name: fixture.awayTeam.name,
          short_name: fixture.awayTeam.shortName,
          tla: fixture.awayTeam.tla,
          crest: fixture.awayTeam.crest,
        }).catch(async (err) => {
          const teams = await storage.getTeams();
          const existingTeam = teams.find(t => t.name === fixture.awayTeam.name);
          if (existingTeam) {
            return storage.updateTeam(existingTeam.id, {
              short_name: fixture.awayTeam.shortName,
              tla: fixture.awayTeam.tla,
              crest: fixture.awayTeam.crest,
            });
          }
          return existingTeam;
        });

        if (!homeTeam || !awayTeam) {
          console.error('Failed to find or create teams for fixture:', fixture);
          continue;
        }

        // Update or insert the fixture using the active season ID
        await storage.createOrUpdateFixture({
          external_id: fixture.id,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          home_score: fixture.score.fullTime.home,
          away_score: fixture.score.fullTime.away,
          kickoff: new Date(fixture.utcDate),
          status: fixture.status,
          winner: fixture.score.winner,
          external_season_id: fixture.season?.id || null, // External season ID from the API
          season_id: activeSeason.id, // Internal season reference
          round_id: null, // Placeholder for round_id
          selected: false,
          game_week_id: null,
        });
      }

      res.json({ message: `Successfully synced ${fixtures.length} fixtures` });
    } catch (error) {
      console.error("Error syncing fixtures:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to sync fixtures" });
    }
  });

  // Player routes
  app.post("/api/picks", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }

    try {
      const { teamId, fixtureId } = req.body;
      
      if (!teamId || !fixtureId) {
        return res.status(400).json({ error: "Team ID and Fixture ID are required" });
      }

      // Get the current active data
      const season = await storage.getActiveSeason();
      if (!season) {
        return res.status(404).send("No active season");
      }

      const round = await storage.getActiveRound(season.id);
      if (!round) {
        return res.status(404).send("No active round");
      }

      const gameWeek = await storage.getActiveGameWeek(round.id);
      if (!gameWeek) {
        return res.status(404).send("No active game week");
      }

      // Get the fixture details to determine if the team is home or away
      const fixture = await storage.getFixtureById(fixtureId);
      if (!fixture) {
        return res.status(404).send("Fixture not found");
      }

      // Determine if the team is the home or away team
      const isHomeTeam = fixture.home_team_id === teamId;
      const isAwayTeam = fixture.away_team_id === teamId;

      if (!isHomeTeam && !isAwayTeam) {
        return res.status(400).json({ error: "Selected team is not part of the fixture" });
      }

      const pickData = {
        userId: req.user.id,
        teamId: teamId,
        gameWeekId: gameWeek.id,
        roundId: round.id,
        seasonId: season.id,
        fixtureId: fixtureId,
        externalId: fixture.external_id,
        isHomeTeam: isHomeTeam,
        pickedAt: new Date(),
        isCorrect: null
      };

      const parsed = insertPickSchema.safeParse(pickData);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }

      const pick = await storage.createPick(parsed.data);
      res.status(201).json(pick);
    } catch (error) {
      console.error("Error creating pick:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create pick" });
    }
  });

  app.get("/api/game-weeks/:id/picks", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }

    const gameWeekId = parseInt(req.params.id);
    const picks = await storage.getPicksByGameWeek(gameWeekId);
    res.json(picks);
  });

  app.get("/api/current", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }

    const season = await storage.getActiveSeason();
    if (!season) {
      return res.status(404).send("No active season");
    }

    const round = await storage.getActiveRound(season.id);
    if (!round) {
      return res.status(404).send("No active round");
    }

    const gameWeek = await storage.getActiveGameWeek(round.id);
    if (!gameWeek) {
      return res.status(404).send("No active game week");
    }

    res.json({ season, round, gameWeek });
  });

  // Add new endpoint to get available teams for current game week
  app.get("/api/available-teams", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }

    try {
      // Get current active season, round, and game week
      const season = await storage.getActiveSeason();
      if (!season) {
        return res.status(404).send("No active season");
      }

      const round = await storage.getActiveRound(season.id);
      if (!round) {
        return res.status(404).send("No active round");
      }

      const gameWeek = await storage.getActiveGameWeek(round.id);
      if (!gameWeek) {
        return res.status(404).send("No active game week");
      }

      // Get all fixtures for the current game week
      const fixtures = await storage.getFixturesByGameWeek(gameWeek.id);

      // Get all teams from these fixtures
      const teamIds = new Set([
        ...fixtures.map(f => f.home_team_id),
        ...fixtures.map(f => f.away_team_id)
      ]);

      // Get user's previous picks for the current round
      const roundGameWeeks = await storage.getGameWeeksByRound(round.id);
      const roundGameWeekIds = roundGameWeeks.map(gw => gw.id);
      const previousPicks = await storage.getPicksByGameWeeks(req.user.id, roundGameWeekIds);
      const previouslyPickedTeamIds = new Set(previousPicks.map(p => p.teamId));

      // Get all teams
      const teams = await storage.getTeams();

      // Format response with available and unavailable teams
      const availableTeams = teams
        .filter(team => teamIds.has(team.id))
        .map(team => ({
          ...team,
          isAvailable: !previouslyPickedTeamIds.has(team.id)
        }));

      res.json(availableTeams);
    } catch (error) {
      console.error("Error getting available teams:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get available teams" });
    }
  });
  // Add this new endpoint after your existing fixture-related endpoints
  app.post("/api/fixtures/assign", async (req, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    try {
      const { fixtureIds, gameWeekId, roundId, seasonId } = req.body;

      if (!Array.isArray(fixtureIds) || !gameWeekId || !roundId || !seasonId) {
        return res.status(400).send("Invalid request data");
      }

      await storage.updateFixturesGameWeek(fixtureIds, gameWeekId, roundId, seasonId);
      res.json({ message: "Fixtures assigned successfully" });
    } catch (error) {
      console.error("Error assigning fixtures:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to assign fixtures" });
    }
  });

  // Add endpoint to get fixtures for a specific game week
  app.get("/api/game-weeks/:id/fixtures", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }

    try {
      const gameWeekId = parseInt(req.params.id);
      if (isNaN(gameWeekId)) {
        return res.status(400).json({ error: "Invalid game week ID" });
      }
      
      const fixturesWithTeams = await storage.getFixturesByGameWeekWithTeams(gameWeekId);
      
      // Transform the data to match the expected format in the frontend
      const formattedFixtures = fixturesWithTeams.map(fixture => ({
        id: fixture.id,
        kickoff: fixture.kickoff,
        status: fixture.status,
        home_score: fixture.home_score,
        away_score: fixture.away_score,
        gameWeekId: fixture.game_week_id,
        homeTeam: {
          id: fixture.home_team_id,
          name: fixture.home_team_name,
          tla: fixture.home_team_tla,
          crest: fixture.home_team_crest
        },
        awayTeam: {
          id: fixture.away_team_id,
          name: fixture.away_team_name,
          tla: fixture.away_team_tla,
          crest: fixture.away_team_crest
        }
      }));
      
      res.json(formattedFixtures);
    } catch (error) {
      console.error("Error getting fixtures for game week:", error);
      res.status(500).json({ error: "Failed to get fixtures for game week" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}