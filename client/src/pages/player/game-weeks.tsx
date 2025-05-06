import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Trophy, Calendar, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Season, Round, GameWeek } from "@shared/schema";

interface TeamData {
  id: number;
  name: string;
  tla: string;
  crest: string;
}

interface Fixture {
  id: number;
  kickoff: string;
  status: string;
  homeTeam: TeamData;
  awayTeam: TeamData;
  home_score: number | null;
  away_score: number | null;
  gameWeekId: number;
}

export default function GameWeeksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedGameWeekId, setExpandedGameWeekId] = useState<number | null>(null);

  // Get all seasons
  const { data: seasons, isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ["/api/seasons/all"]
  });

  // Get all rounds
  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ["/api/rounds/all"]
  });

  // Get all game weeks
  const { data: gameWeeks, isLoading: gameWeeksLoading } = useQuery<GameWeek[]>({
    queryKey: ["/api/game-weeks/all"]
  });

  // Fetch fixtures for the expanded game week
  const { 
    data: expandedFixtures, 
    isLoading: fixturesLoading 
  } = useQuery<Fixture[]>({
    queryKey: [`/api/game-weeks/${expandedGameWeekId}/fixtures`],
    enabled: expandedGameWeekId !== null,
  });

  // Function to toggle game week expansion
  const toggleGameWeekExpansion = (gameWeekId: number) => {
    if (expandedGameWeekId === gameWeekId) {
      setExpandedGameWeekId(null);
    } else {
      setExpandedGameWeekId(gameWeekId);
    }
  };

  if (seasonsLoading || roundsLoading || gameWeeksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!seasons || !rounds || !gameWeeks) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-border/60 shadow-md">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground p-4">
              No data available. Please check back later.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group game weeks by season and round
  const groupedData: Array<{
    season: Season;
    round: Round;
    gameWeeks: GameWeek[];
  }> = [];

  gameWeeks.forEach(gameWeek => {
    const round = rounds.find(r => r.id === gameWeek.roundId);
    if (!round) return;

    const season = seasons.find(s => s.id === round.seasonId);
    if (!season) return;

    // Look for an existing group
    const existingGroup = groupedData.find(
      g => g.season.id === season.id && g.round.id === round.id
    );

    if (existingGroup) {
      existingGroup.gameWeeks.push(gameWeek);
    } else {
      groupedData.push({
        season,
        round,
        gameWeeks: [gameWeek]
      });
    }
  });

  // Sort groups by season ID and round number (descending)
  const sortedGroups = groupedData.sort((a, b) => {
    if (b.season.id !== a.season.id) {
      return b.season.id - a.season.id;
    }
    return b.round.number - a.round.number;
  });



  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="container mx-auto px-4 py-6"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-2 mb-4"
        >
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.8 }}
            >
              <Calendar className="h-7 w-7 text-primary" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent">
              Game Weeks & Fixtures
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            View all game weeks and their assigned fixtures across seasons and rounds.
          </p>
        </motion.div>

        {sortedGroups.length === 0 ? (
          <Card className="border-border/60 shadow-md">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground p-4">
                No game weeks found. Please check back later.
              </div>
            </CardContent>
          </Card>
        ) : (
          sortedGroups.map(({ season, round, gameWeeks }) => (
            <motion.div
              key={`${season.id}-${round.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <Card className="border-border/60 shadow-md overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    {season.name} - Round {round.number}
                    {round.isActive && (
                      <span className="ml-2 text-xs font-normal px-2 py-1 rounded-full bg-primary/10 text-primary">
                        Active Round
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Game weeks for Season {season.name}, Round {round.number}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 divide-y divide-border/30">
                  {gameWeeks
                    .sort((a, b) => b.number - a.number)
                    .map((gameWeek) => (
                      <div key={gameWeek.id} className="py-4 first:pt-0 last:pb-0">
                        <div 
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                            expandedGameWeekId === gameWeek.id 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                          onClick={() => toggleGameWeekExpansion(gameWeek.id)}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Game Week {gameWeek.number}</span>
                              {gameWeek.isActive && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              Deadline: {format(new Date(gameWeek.deadline), "PPP p")}
                            </span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            {expandedGameWeekId === gameWeek.id ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                        
                        <AnimatePresence>
                          {expandedGameWeekId === gameWeek.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pl-3 space-y-3">
                                {fixturesLoading ? (
                                  <div className="text-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                    <p className="text-sm text-muted-foreground mt-2">Loading fixtures...</p>
                                  </div>
                                ) : !expandedFixtures || expandedFixtures.length === 0 ? (
                                  <div className="text-center text-muted-foreground p-3 bg-muted/20 rounded-lg">
                                    No fixtures assigned to this game week.
                                  </div>
                                ) : (
                                  [...expandedFixtures].sort((a, b) => 
                                    new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
                                  ).map(fixture => (
                                    <motion.div
                                      key={fixture.id}
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/20 p-3 rounded-lg border border-border/40"
                                    >
                                      <span className="text-sm text-muted-foreground min-w-[100px]">
                                        {format(new Date(fixture.kickoff), "EEE, MMM d • p")}
                                      </span>
                                      <div className="flex items-center justify-between flex-1">
                                        <div className="flex items-center gap-2">
                                          <img 
                                            src={fixture.homeTeam.crest} 
                                            alt={fixture.homeTeam.name}
                                            className="w-6 h-6"
                                          />
                                          <span className="font-medium text-sm sm:text-base">
                                            {fixture.homeTeam.name}
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mx-2">
                                          {fixture.status === "FINISHED" ? (
                                            <div className="px-3 py-1 rounded bg-background border border-border/40 min-w-[60px] text-center">
                                              <span className="font-semibold">
                                                {fixture.home_score} - {fixture.away_score}
                                              </span>
                                            </div>
                                          ) : fixture.status === "LIVE" ? (
                                            <div className="px-3 py-1 rounded bg-green-500/10 border border-green-500/30 min-w-[60px] text-center">
                                              <span className="font-semibold text-green-500">LIVE</span>
                                            </div>
                                          ) : (
                                            <div className="px-3 py-1 rounded bg-primary/5 border border-primary/20 min-w-[60px] text-center">
                                              <span className="text-xs text-primary font-medium">
                                                {format(new Date(fixture.kickoff), "HH:mm")}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm sm:text-base">
                                            {fixture.awayTeam.name}
                                          </span>
                                          <img 
                                            src={fixture.awayTeam.crest} 
                                            alt={fixture.awayTeam.name}
                                            className="w-6 h-6"
                                          />
                                        </div>
                                      </div>
                                      <span className={cn(
                                        "text-xs font-medium px-2 py-1 rounded-full self-start sm:self-center",
                                        fixture.status === "SCHEDULED" && "bg-amber-500/10 text-amber-500",
                                        fixture.status === "LIVE" && "bg-green-500/10 text-green-500",
                                        fixture.status === "FINISHED" && "bg-blue-500/10 text-blue-500",
                                        fixture.status === "POSTPONED" && "bg-red-500/10 text-red-500"
                                      )}>
                                        {fixture.status}
                                      </span>
                                    </motion.div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}