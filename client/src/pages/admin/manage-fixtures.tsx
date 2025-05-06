import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, Trophy, Search, Calendar, CheckCircle2, Layers, Box } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
}

interface Season {
  id: number;
  name: string;
}

interface Round {
  id: number;
  number: number;
  seasonId: number;
}

interface GameWeek {
  id: number;
  number: number;
  roundId: number;
}

export default function ManageFixturesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>();
  const [selectedRoundId, setSelectedRoundId] = useState<string>();
  const [selectedGameWeekId, setSelectedGameWeekId] = useState<string>();
  const [selectedFixtures, setSelectedFixtures] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Get all fixtures
  const { data: fixtures, isLoading: fixturesLoading } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures/all"],
    onError: (error: Error) => {
      console.error("Error fetching fixtures:", error);
      toast({
        title: "Failed to fetch fixtures",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Get all seasons
  const { data: seasons } = useQuery<Season[]>({
    queryKey: ["/api/seasons/all"],
  });

  // Get rounds for selected season
  const { data: rounds } = useQuery<Round[]>({
    queryKey: ["/api/rounds/all"],
    select: (rounds) =>
      rounds.filter((round) => round.seasonId === parseInt(selectedSeasonId || "0")),
    enabled: !!selectedSeasonId,
  });

  // Get game weeks for selected round
  const { data: gameWeeks } = useQuery<GameWeek[]>({
    queryKey: ["/api/game-weeks/all"],
    select: (gameWeeks) =>
      gameWeeks.filter((gw) => gw.roundId === parseInt(selectedRoundId || "0")),
    enabled: !!selectedRoundId,
  });

  // Mutation to assign fixtures to game week
  const assignFixturesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGameWeekId || !selectedRoundId || !selectedSeasonId) {
        throw new Error("Please select a season, round, and game week");
      }
      const res = await apiRequest("POST", "/api/fixtures/assign", {
        fixtureIds: Array.from(selectedFixtures),
        gameWeekId: parseInt(selectedGameWeekId),
        roundId: parseInt(selectedRoundId),
        seasonId: parseInt(selectedSeasonId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixtures/all"] });
      toast({
        title: "Fixtures assigned",
        description: "The selected fixtures have been assigned to the game week",
      });
      setSelectedFixtures(new Set());
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign fixtures",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredFixtures = fixtures?.filter((fixture) =>
    !searchTerm ||
    fixture.homeTeam.tla?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fixture.awayTeam.tla?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (fixturesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Function to activate a season
  const handleActivateSeason = async (seasonId: string) => {
    try {
      await apiRequest("POST", `/api/seasons/${seasonId}/activate`);
      queryClient.invalidateQueries({ queryKey: ["/api/seasons/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rounds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-weeks/all"] });
      toast({
        title: "Season activated",
        description: "The selected season has been activated",
      });
    } catch (error) {
      toast({
        title: "Failed to activate season",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="container mx-auto px-4 py-6"
    >
      <div className="max-w-[1400px] mx-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.8 }}
            >
              <Trophy className="h-7 w-7 text-primary" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent">
              Manage Fixtures
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Assign fixtures to game weeks and manage active seasons, rounds, and game weeks.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border/60 shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Assign Fixtures to Game Week
              </CardTitle>
              <CardDescription>
                Select the active season, round, and game week, then choose the fixtures to include.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="relative sm:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Season</label>
                    <Select 
                      value={selectedSeasonId} 
                      onValueChange={(value) => {
                        setSelectedSeasonId(value);
                        handleActivateSeason(value);
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select Season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons?.map((season) => (
                          <SelectItem key={season.id} value={season.id.toString()}>
                            <div className="flex items-center gap-2">
                              {season.isActive && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              )}
                              <span>{season.name} {season.isActive && "(Active)"}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative sm:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Round</label>
                    <Select
                      value={selectedRoundId}
                      onValueChange={(value) => {
                        setSelectedRoundId(value);
                        // Activate the round when selected
                        if (value) {
                          apiRequest("POST", `/api/rounds/${value}/activate`)
                            .then(() => {
                              queryClient.invalidateQueries({ queryKey: ["/api/rounds/all"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/game-weeks/all"] });
                              toast({
                                title: "Round activated",
                                description: "The selected round has been set as active",
                              });
                            })
                            .catch((error) => {
                              toast({
                                title: "Failed to activate round",
                                description: error instanceof Error ? error.message : "Unknown error occurred",
                                variant: "destructive",
                              });
                            });
                        }
                      }}
                      disabled={!selectedSeasonId}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select Round" />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds?.map((round) => (
                          <SelectItem key={round.id} value={round.id.toString()}>
                            <div className="flex items-center gap-2">
                              {round.isActive && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              )}
                              <span>Round {round.number} {round.isActive && "(Active)"}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative sm:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Game Week</label>
                    <Select
                      value={selectedGameWeekId}
                      onValueChange={(value) => {
                        setSelectedGameWeekId(value);
                        // Activate the game week when selected
                        if (value) {
                          apiRequest("POST", `/api/game-weeks/${value}/activate`)
                            .then(() => {
                              queryClient.invalidateQueries({ queryKey: ["/api/game-weeks/all"] });
                              toast({
                                title: "Game Week activated",
                                description: "The selected game week has been set as active",
                              });
                            })
                            .catch((error) => {
                              toast({
                                title: "Failed to activate game week",
                                description: error instanceof Error ? error.message : "Unknown error occurred",
                                variant: "destructive",
                              });
                            });
                        }
                      }}
                      disabled={!selectedRoundId}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select Game Week" />
                      </SelectTrigger>
                      <SelectContent>
                        {gameWeeks?.map((gw) => (
                          <SelectItem key={gw.id} value={gw.id.toString()}>
                            <div className="flex items-center gap-2">
                              {gw.isActive && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              )}
                              <span>Week {gw.number} {gw.isActive && "(Active)"}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end sm:col-span-1">
                    <Button
                      onClick={() => assignFixturesMutation.mutate()}
                      disabled={!selectedGameWeekId || selectedFixtures.size === 0}
                      className="h-12 w-full"
                    >
                      {assignFixturesMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <>
                          <Box className="mr-2 h-5 w-5" />
                          Assign {selectedFixtures.size > 0 ? `(${selectedFixtures.size})` : ""}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    placeholder="Search fixtures by team code (e.g. ARS, MUN)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 pl-10"
                  />
                </div>
                
                <div className="bg-muted/20 border border-border/50 rounded-lg p-3">
                  <div className="text-xs uppercase font-medium text-muted-foreground mb-2 flex justify-between items-center">
                    <span>Available Fixtures ({filteredFixtures?.length || 0})</span>
                    <span>{selectedFixtures.size} selected</span>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {filteredFixtures?.length === 0 ? (
                      <div className="text-center text-muted-foreground p-4">
                        No fixtures found matching your search criteria.
                      </div>
                    ) : (
                      filteredFixtures?.map((fixture) => (
                        <motion.div
                          key={fixture.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg transition-all",
                            selectedFixtures.has(fixture.id) 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover:bg-muted/50 border border-transparent hover:border-border/80"
                          )}
                        >
                          <Checkbox
                            checked={selectedFixtures.has(fixture.id)}
                            onCheckedChange={(checked) => {
                              const newSelection = new Set(selectedFixtures);
                              if (checked) {
                                newSelection.add(fixture.id);
                              } else {
                                newSelection.delete(fixture.id);
                              }
                              setSelectedFixtures(newSelection);
                            }}
                            className="h-5 w-5"
                          />
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <span className="text-sm text-muted-foreground min-w-[100px]">
                              {format(new Date(fixture.kickoff), "MMM d, HH:mm")}
                            </span>
                            <div className="flex items-center gap-2 flex-1 mt-1 sm:mt-0">
                              <div className="flex items-center">
                                <img 
                                  src={fixture.homeTeam.crest} 
                                  alt={fixture.homeTeam.name}
                                  className="w-6 h-6"
                                />
                                <span className="font-medium ml-2">
                                  {fixture.homeTeam.tla}
                                </span>
                              </div>
                              <span className="mx-2 text-muted-foreground">vs</span>
                              <div className="flex items-center">
                                <img 
                                  src={fixture.awayTeam.crest} 
                                  alt={fixture.awayTeam.name}
                                  className="w-6 h-6"
                                />
                                <span className="font-medium ml-2">
                                  {fixture.awayTeam.tla}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
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
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}