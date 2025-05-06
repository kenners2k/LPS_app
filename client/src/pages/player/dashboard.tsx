import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertPickSchema, CurrentData, Pick as PickType } from "@shared/schema";
import { Loader2, Trophy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { motion } from "framer-motion";

interface AvailableTeam {
  id: number;
  name: string;
  short_name: string;
  tla: string;
  crest: string;
  isAvailable: boolean;
}

export default function PlayerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Get current game week info
  const { data: current, isLoading: currentLoading } = useQuery<CurrentData>({
    queryKey: ["/api/current"],
    onSuccess: (data) => {
      if (!data?.gameWeek) {
        toast({
          title: "No active game week",
          description: "There's no active game week set up yet",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Error fetching current info:", error);
      toast({
        title: "Failed to fetch current game week",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Get available teams
  const { data: teams, isLoading: teamsLoading } = useQuery<AvailableTeam[]>({
    queryKey: ["/api/available-teams"],
    enabled: !!current?.gameWeek?.id,
  });

  // Get fixtures for the current game week
  const { data: fixtures, isLoading: fixturesLoading } = useQuery<any[]>({
    queryKey: [`/api/game-weeks/${current?.gameWeek?.id}/fixtures`],
    enabled: !!current?.gameWeek?.id,
  });

  // Get current game week picks
  const { data: picks, isLoading: picksLoading } = useQuery<PickType[]>({
    queryKey: ["/api/game-weeks", current?.gameWeek?.id, "picks"],
    enabled: !!current?.gameWeek?.id,
  });

  // Find the fixture for a team
  const findFixtureForTeam = (teamId: number) => {
    if (!fixtures) return null;
    
    // Look for the team in either home or away team
    return fixtures.find(fixture => 
      fixture.homeTeam.id === teamId || fixture.awayTeam.id === teamId
    );
  };

  // Form setup
  const pickForm = useForm({
    resolver: zodResolver(insertPickSchema.omit({ userId: true })),
    defaultValues: {
      gameWeekId: current?.gameWeek?.id,
      teamId: undefined,
      fixtureId: undefined,
    },
  });

  // Create pick mutation
  const createPickMutation = useMutation({
    mutationFn: async (data: any) => {
      // Find the fixture for the selected team
      const teamId = data.teamId;
      const fixture = findFixtureForTeam(teamId);
      
      if (!fixture) {
        throw new Error('No fixture found for the selected team');
      }
      
      const res = await apiRequest("POST", "/api/picks", {
        teamId,
        fixtureId: fixture.id,
        gameWeekId: current?.gameWeek?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-weeks", current?.gameWeek?.id, "picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/available-teams"] });
      toast({
        title: "Pick submitted",
        description: "Your team selection has been saved",
      });
      pickForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit pick",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (currentLoading || teamsLoading || picksLoading || fixturesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userPick = picks?.find((p: any) => p.userId === user?.id);
  const deadline = current?.gameWeek?.deadline ? new Date(current.gameWeek.deadline) : new Date();
  const canPick = !userPick && deadline > new Date();
  
  // Sort teams by availability and name
  const sortedTeams = teams?.sort((a, b) => {
    // First sort by availability (available teams first)
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    // Then sort alphabetically by name
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-background pt-6 pb-12 px-4 md:px-6">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-2 mb-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.8 }}
            >
              <Trophy className="h-8 w-8 text-primary" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
              Last Player Standing
            </h1>
          </div>
          <p className="text-muted-foreground ml-1 max-w-2xl">
            Make your picks and stay in the game. Choose wisely - once a team loses or draws, you're out!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="mb-6 md:mb-8 overflow-hidden border-border/60 shadow-md">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-primary animate-pulse mr-1"></span>
                Current Game Week
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card shadow-sm border border-border/50 rounded-lg p-3 md:p-4">
                  <p className="text-xs uppercase font-medium text-muted-foreground mb-1">Season</p>
                  <p className="text-xl font-semibold">{current?.season?.name}</p>
                </div>
                <div className="bg-card shadow-sm border border-border/50 rounded-lg p-3 md:p-4">
                  <p className="text-xs uppercase font-medium text-muted-foreground mb-1">Round</p>
                  <p className="text-xl font-semibold">{current?.round?.number}</p>
                </div>
                <div className="bg-card shadow-sm border border-border/50 rounded-lg p-3 md:p-4">
                  <p className="text-xs uppercase font-medium text-muted-foreground mb-1">Game Week</p>
                  <p className="text-xl font-semibold">{current?.gameWeek?.number}</p>
                </div>
                <div className="bg-card shadow-sm border border-border/50 rounded-lg p-3 md:p-4">
                  <p className="text-xs uppercase font-medium text-muted-foreground mb-1">Deadline</p>
                  <div className="flex flex-col">
                    <p className="text-xl font-semibold">
                      {new Date(deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {canPick ? (
          <Card className="mb-4 md:mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Make Your Pick</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-2 text-xs"
                >
                  List View
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="h-8 px-2 text-xs"
                >
                  Card View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...pickForm}>
                <form onSubmit={pickForm.handleSubmit((data) => createPickMutation.mutate(data))} className="space-y-4">
                  {viewMode === 'list' ? (
                    <FormField
                      control={pickForm.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Team</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select a team" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sortedTeams?.map((team) => (
                                <SelectItem 
                                  key={team.id} 
                                  value={team.id.toString()}
                                  disabled={!team.isAvailable}
                                  className={!team.isAvailable ? "opacity-50" : ""}
                                >
                                  <div className="flex items-center gap-2 py-1">
                                    {team.crest && (
                                      <img src={team.crest} alt={team.name} className="w-6 h-6" />
                                    )}
                                    <span>{team.name}</span>
                                    {!team.isAvailable && (
                                      <span className="text-xs text-muted-foreground">(Already picked)</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={pickForm.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Team</FormLabel>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {sortedTeams?.map((team) => (
                              <div 
                                key={team.id}
                                onClick={() => {
                                  if (team.isAvailable) {
                                    field.onChange(team.id);
                                  }
                                }}
                                className={`
                                  relative flex flex-col items-center justify-center p-3 rounded-lg border-2 
                                  ${field.value === team.id ? 'border-primary bg-primary/10' : 'border-muted bg-card'} 
                                  ${team.isAvailable ? 'cursor-pointer hover:border-primary/50' : 'opacity-40 cursor-not-allowed'}
                                  transition-all duration-200
                                `}
                              >
                                {!team.isAvailable && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                                    <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full">Already Picked</span>
                                  </div>
                                )}
                                <div className="w-12 h-12 mb-2 flex items-center justify-center">
                                  {team.crest ? (
                                    <img src={team.crest} alt={team.name} className="max-w-full max-h-full" />
                                  ) : (
                                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                      <span className="text-xs font-bold">{team.tla || team.name.slice(0, 3)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-medium line-clamp-1">{team.name}</div>
                                  <div className="text-xs text-muted-foreground">{team.tla}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {field.value !== undefined && (
                            <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center gap-3">
                              <span className="text-sm font-medium">Selected:</span>
                              <div className="flex items-center gap-2">
                                {sortedTeams?.find(t => t.id === field.value)?.crest && (
                                  <img 
                                    src={sortedTeams?.find(t => t.id === field.value)?.crest} 
                                    alt="Team crest" 
                                    className="w-6 h-6"
                                  />
                                )}
                                <span className="font-medium">
                                  {sortedTeams?.find(t => t.id === field.value)?.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  )}
                  <Button
                    type="submit"
                    disabled={createPickMutation.isPending || pickForm.getValues().teamId === undefined}
                    className="w-full h-12 text-lg mt-6"
                  >
                    {createPickMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Submit Pick"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : userPick ? (
          <Card className="mb-4 md:mb-6">
            <CardHeader>
              <CardTitle>Your Pick</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                {teams?.find(t => t.id === userPick.teamId)?.crest && (
                  <img 
                    src={teams?.find(t => t.id === userPick.teamId)?.crest} 
                    alt="Team crest" 
                    className="w-8 h-8"
                  />
                )}
                <span className="text-lg">{teams?.find(t => t.id === userPick.teamId)?.name}</span>
                {userPick.isCorrect !== null && (
                  <span className={`ml-auto font-medium ${userPick.isCorrect ? "text-green-500" : "text-red-500"}`}>
                    {userPick.isCorrect ? "Won" : "Lost"}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-4 md:mb-6 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Deadline Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <p>The deadline for submitting picks has passed.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Picks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.isArray(picks) && picks.length === 0 ? (
                <p>No picks made yet</p>
              ) : (
                picks?.map((pick: any) => (
                  <div key={pick.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Player {pick.userId}</span>
                    <div className="flex items-center gap-2">
                      {teams?.find((t) => t.id === pick.teamId)?.crest && (
                        <img 
                          src={teams?.find((t) => t.id === pick.teamId)?.crest}
                          alt="Team crest"
                          className="w-6 h-6"
                        />
                      )}
                      <span>{teams?.find((t) => t.id === pick.teamId)?.name}</span>
                    </div>
                    {pick.isCorrect !== null && (
                      <span className={`font-medium ${pick.isCorrect ? "text-green-500" : "text-red-500"}`}>
                        {pick.isCorrect ? "Won" : "Lost"}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}