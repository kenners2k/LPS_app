import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface Season {
  id: number;
  name: string;
  isActive: boolean;
}

interface Round {
  id: number;
  seasonId: number;
  number: number;
  isActive: boolean;
}

interface GameWeek {
  id: number;
  roundId: number;
  number: number;
  deadline: string;
  isActive: boolean;
}

export default function ManagePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for selected items
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>();
  const [selectedRound, setSelectedRound] = useState<number | undefined>();
  const [selectedGameWeek, setSelectedGameWeek] = useState<number | undefined>();

  // Get all items
  const { data: seasons, isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ["/api/seasons/all"],
  });

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ["/api/rounds/all"],
    select: (rounds) => rounds.filter((round) => !selectedSeason || round.seasonId === selectedSeason),
  });

  const { data: gameWeeks, isLoading: gameWeeksLoading } = useQuery<GameWeek[]>({
    queryKey: ["/api/game-weeks/all"],
    select: (gameWeeks) => gameWeeks.filter((gameWeek) => !selectedRound || gameWeek.roundId === selectedRound),
  });

  // Mutations for setting active items
  const setActiveSeasonMutation = useMutation({
    mutationFn: async (seasonId: number) => {
      const res = await apiRequest("POST", `/api/seasons/${seasonId}/activate`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/current"] });
      toast({
        title: "Season updated",
        description: "Active season has been updated",
      });
    },
  });

  const setActiveRoundMutation = useMutation({
    mutationFn: async (roundId: number) => {
      const res = await apiRequest("POST", `/api/rounds/${roundId}/activate`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/current"] });
      toast({
        title: "Round updated",
        description: "Active round has been updated",
      });
    },
  });

  const setActiveGameWeekMutation = useMutation({
    mutationFn: async (gameWeekId: number) => {
      const res = await apiRequest("POST", `/api/game-weeks/${gameWeekId}/activate`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-weeks/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/current"] });
      toast({
        title: "Game Week updated",
        description: "Active game week has been updated",
      });
    },
  });

  const handleUpdate = async () => {
    try {
      // Process mutations sequentially to maintain proper order
      if (selectedSeason !== undefined) {
        await setActiveSeasonMutation.mutateAsync(selectedSeason);
      }

      // Wait a bit for the season update to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      if (selectedRound !== undefined) {
        await setActiveRoundMutation.mutateAsync(selectedRound);
      }

      // Wait a bit for the round update to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      if (selectedGameWeek !== undefined) {
        await setActiveGameWeekMutation.mutateAsync(selectedGameWeek);
      }

      // Force refresh all queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/seasons/all"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rounds/all"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/game-weeks/all"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/current"] })
      ]);

      // Reset selection state
      setSelectedSeason(undefined);
      setSelectedRound(undefined);
      setSelectedGameWeek(undefined);

      // Refetch queries to ensure fresh data
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/seasons/all"] }),
        queryClient.refetchQueries({ queryKey: ["/api/rounds/all"] }),
        queryClient.refetchQueries({ queryKey: ["/api/game-weeks/all"] }),
        queryClient.refetchQueries({ queryKey: ["/api/current"] })
      ]);

      toast({
        title: "Update successful",
        description: "Active items have been updated",
      });
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update active items",
        variant: "destructive",
      });
    }
  };

  const handleSeasonChange = (value: string) => {
    const seasonId = parseInt(value);
    setSelectedSeason(seasonId);
    setSelectedRound(undefined);
    setSelectedGameWeek(undefined);
  };

  const handleRoundChange = (value: string) => {
    const roundId = parseInt(value);
    setSelectedRound(roundId);
    setSelectedGameWeek(undefined);
  };

  if (seasonsLoading || roundsLoading || gameWeeksLoading) {
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent">
            Manage Active Items
          </h1>
          <Button variant="outline" onClick={() => window.location.href = '/admin'}>
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seasons</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={selectedSeason?.toString()} 
              onValueChange={handleSeasonChange}
              className="space-y-2"
            >
              {seasons?.map((season) => (
                <div key={season.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={season.id.toString()} id={`season-${season.id}`} />
                    <Label htmlFor={`season-${season.id}`}>{season.name}</Label>
                  </div>
                  {season.isActive && (
                    <span className="text-sm text-primary font-medium">Currently Active</span>
                  )}
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={selectedRound?.toString()} 
              onValueChange={handleRoundChange}
              className="space-y-2"
            >
              {rounds?.map((round) => (
                <div key={round.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={round.id.toString()} 
                      id={`round-${round.id}`}
                      disabled={!selectedSeason || round.seasonId !== selectedSeason}
                    />
                    <Label htmlFor={`round-${round.id}`}>
                      <span>Round {round.number}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (Season: {seasons?.find(s => s.id === round.seasonId)?.name})
                      </span>
                    </Label>
                  </div>
                  {round.isActive && (
                    <span className="text-sm text-primary font-medium">Currently Active</span>
                  )}
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Game Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={selectedGameWeek?.toString()} 
              onValueChange={(value) => setSelectedGameWeek(parseInt(value))}
              className="space-y-2"
            >
              {gameWeeks?.map((gameWeek) => (
                <div key={gameWeek.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={gameWeek.id.toString()} 
                      id={`gameweek-${gameWeek.id}`}
                      disabled={!selectedRound || gameWeek.roundId !== selectedRound}
                    />
                    <Label htmlFor={`gameweek-${gameWeek.id}`}>
                      <span>Week {gameWeek.number}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (Round: {rounds?.find(r => r.id === gameWeek.roundId)?.number})
                      </span>
                    </Label>
                  </div>
                  {gameWeek.isActive && (
                    <span className="text-sm text-primary font-medium">Currently Active</span>
                  )}
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleUpdate}
            disabled={!selectedSeason && !selectedRound && !selectedGameWeek}
          >
            Update Active Items
          </Button>
        </div>
      </div>
    </div>
  );
}