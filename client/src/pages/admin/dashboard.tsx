import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormSetValue } from "react-hook-form";
import { insertSeasonSchema, insertRoundSchema, insertGameWeekSchema } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";


interface APIFixture {
  id: number;
  homeTeam: {
    id: number;
    name: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    tla: string;
    crest: string;
  };
  utcDate: string;
  status: string;
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
  selected?: boolean;
}

interface CurrentData {
  season?: {
    id: number;
    name: string;
  };
  round?: {
    id: number;
    number: number;
  };
  gameWeek?: {
    id: number;
    number: number;
    deadline: string;
  };
}

interface Season {
  id: number;
  name: string;
  // Add other necessary Season properties here if needed.
}

interface Round {
  id: number;
  number: number;
  seasonId: number;
}

function FixtureSyncSection() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const { toast } = useToast();

  const syncFixturesMutation = useMutation({
    mutationFn: async () => {
      const formattedDateFrom = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined;
      const formattedDateTo = dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined;

      const res = await apiRequest("POST", "/api/fixtures/sync", {
        dateFrom: formattedDateFrom,
        dateTo: formattedDateTo,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fixtures synced",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Sync Fixtures</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="grid gap-2 flex-1">
            <Label>From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2 flex-1">
            <Label>To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-end">
            <Button
              className="w-full sm:w-auto"
              onClick={() => syncFixturesMutation.mutate()}
              disabled={syncFixturesMutation.isPending}
            >
              {syncFixturesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Fixtures'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("season");

  // Get current active season/round/gameweek
  const { data: current, isLoading } = useQuery<CurrentData>({
    queryKey: ["/api/current"],
  });

  // Get all seasons for round creation
  const { data: seasons, isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ["/api/seasons/all"],
  });

  // Get rounds for selected season
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | undefined>();
  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ["/api/rounds/all", selectedSeasonId],
    select: (rounds) => rounds.filter((round) => round.seasonId === selectedSeasonId),
    enabled: !!selectedSeasonId,
  });


  // Form setup
  const seasonForm = useForm({
    resolver: zodResolver(insertSeasonSchema),
    defaultValues: {
      name: "",
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      isActive: true,
    },
  });

  const roundForm = useForm({
    resolver: zodResolver(insertRoundSchema),
    defaultValues: {
      seasonId: undefined,
      number: 1,
      isActive: true,
    },
  });

  const gameWeekForm = useForm({
    resolver: zodResolver(insertGameWeekSchema),
    defaultValues: {
      roundId: current?.round?.id,
      number: 1,
      deadline: new Date().toISOString(),
      isActive: true,
      fixtures: [] as APIFixture[],
    },
  });

  // Mutations
  const createSeasonMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert the date strings to ISO format
      const formattedData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      const res = await apiRequest("POST", "/api/seasons", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      toast({
        title: "Season created",
        description: "The new season has been created successfully",
      });
      seasonForm.reset();
    },
  });

  const createRoundMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        seasonId: parseInt(data.seasonId),
        number: parseInt(data.number),
        isActive: !!data.isActive,
      };
      const res = await apiRequest("POST", "/api/rounds", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/current"] });
      toast({
        title: "Round created",
        description: "The new round has been created successfully",
      });
      roundForm.reset();
    },
  });

  // Update the fixtures query to include seasonId
  const { data: availableFixtures, isLoading: fixturesLoading } = useQuery<APIFixture[]>({
    queryKey: ["/api/fixtures/available", selectedSeasonId],
    enabled: !!selectedSeasonId,
    queryFn: async () => {
      console.log('Fetching fixtures with seasonId:', selectedSeasonId);
      const res = await fetch(`/api/fixtures/available?seasonId=${selectedSeasonId}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch fixtures: ${res.status} ${res.statusText} - ${text}`);
      }
      const data = await res.json();
      console.log('Fetched fixtures:', data);
      return data;
    },
  });

  useEffect(() => {
    if (selectedSeasonId) {
      gameWeekForm.setValue("seasonId", selectedSeasonId);
    }
  }, [selectedSeasonId, gameWeekForm]);

  // Update the game week creation mutation
  const createGameWeekMutation = useMutation({
    mutationFn: async (data: any) => {
      const selectedFixtures = data.fixtures?.filter((f: any) => f.selected).map((f: any) => f.id) || [];
      const formattedData = {
        ...data,
        roundId: parseInt(data.roundId),
        number: parseInt(data.number),
        deadline: new Date(data.deadline).toISOString(),
        isActive: !!data.isActive,
        fixtureIds: selectedFixtures,
      };
      const res = await apiRequest("POST", "/api/game-weeks", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fixtures/available"] });
      toast({
        title: "Game week created",
        description: "The new game week has been created successfully",
      });
      gameWeekForm.reset();
    },
    onError: (error: Error) => {
      console.error("Error creating game week:", error);
      toast({
        title: "Failed to create game week",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || seasonsLoading || roundsLoading) {
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
            Admin Dashboard
          </h1>
          <Button variant="outline" onClick={() => window.location.href = '/admin/manage'}>
            Manage Active Items
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Active Season: {current?.season?.name || "None"}</p>
              <p>Active Round: {current?.round?.number || "None"}</p>
              <p>Active Game Week: {current?.gameWeek?.number || "None"}</p>
            </div>
          </CardContent>
        </Card>

        <FixtureSyncSection />

        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="season">Season</TabsTrigger>
            <TabsTrigger value="round">Round</TabsTrigger>
            <TabsTrigger value="gameweek">Game Week</TabsTrigger>
          </TabsList>

          <TabsContent value="season">
            <Card>
              <CardHeader>
                <CardTitle>Create Season</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...seasonForm}>
                  <form onSubmit={seasonForm.handleSubmit((data) => createSeasonMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={seasonForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={seasonForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={seasonForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createSeasonMutation.isPending}>
                      Create Season
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="round">
            <Card>
              <CardHeader>
                <CardTitle>Create Round</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...roundForm}>
                  <form onSubmit={roundForm.handleSubmit((data) => createRoundMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={roundForm.control}
                      name="seasonId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Season</FormLabel>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a season" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {seasons?.map((season) => (
                                <SelectItem key={season.id} value={season.id.toString()}>
                                  {season.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roundForm.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Round Number</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createRoundMutation.isPending}>
                      Create Round
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gameweek">
            <Card>
              <CardHeader>
                <CardTitle>Create Game Week</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...gameWeekForm}>
                  <form onSubmit={gameWeekForm.handleSubmit((data) => createGameWeekMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={gameWeekForm.control}
                      name="seasonId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Season</FormLabel>
                          <Select
                            value={selectedSeasonId?.toString()}
                            onValueChange={(value) => {
                              const seasonId = parseInt(value);
                              setSelectedSeasonId(seasonId);
                              gameWeekForm.setValue("seasonId", seasonId);
                              gameWeekForm.setValue("roundId", undefined);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue>
                                  {selectedSeasonId
                                    ? seasons?.find(s => s.id === selectedSeasonId)?.name
                                    : "Select a season"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {seasons?.map((season) => (
                                <SelectItem key={season.id} value={season.id.toString()}>
                                  {season.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={gameWeekForm.control}
                      name="roundId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Round</FormLabel>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            disabled={!selectedSeasonId || roundsLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={!selectedSeasonId ? "Select a season first" : "Select a round"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rounds?.map((round) => (
                                <SelectItem key={round.id} value={round.id.toString()}>
                                  Round {round.number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={gameWeekForm.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Week Number</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={gameWeekForm.control}
                      name="deadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deadline</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="font-medium">Available Fixtures</h3>
                      {fixturesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : availableFixtures && availableFixtures.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto p-1">
                          {availableFixtures.map((fixture) => (
                            <Card key={fixture.id} className={cn(
                              "hover:bg-muted/50 transition-colors",
                              fixture.selected && "border-primary"
                            )}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <Checkbox
                                    checked={fixture.selected}
                                    onCheckedChange={(checked) => {
                                      const updatedFixtures = availableFixtures.map((f) =>
                                        f.id === fixture.id ? { ...f, selected: checked } : f
                                      );
                                      gameWeekForm.setValue("fixtures", updatedFixtures);
                                    }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm text-muted-foreground">
                                        {format(new Date(fixture.utcDate), "MMM d, HH:mm")}
                                      </span>
                                      <span className={cn(
                                        "text-sm",
                                        fixture.status === "LIVE" && "text-green-500 font-medium",
                                        fixture.status === "FINISHED" && "text-muted-foreground",
                                        fixture.status === "POSTPONED" && "text-red-500"
                                      )}>
                                        {fixture.status}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={fixture.homeTeam.crest}
                                          alt={fixture.homeTeam.name}
                                          className="w-8 h-8 object-contain"
                                        />
                                        <span className="font-medium truncate" title={fixture.homeTeam.name}>
                                          {fixture.homeTeam.tla}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-center min-w-[60px] font-medium">
                                        vs
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="font-medium truncate" title={fixture.awayTeam.name}>
                                          {fixture.awayTeam.tla}
                                        </span>
                                        <img
                                          src={fixture.awayTeam.crest}
                                          alt={fixture.awayTeam.name}
                                          className="w-8 h-8 object-contain"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No fixtures available</p>
                      )}
                    </div>

                    <Button type="submit" disabled={createGameWeekMutation.isPending}>
                      Create Game Week
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}