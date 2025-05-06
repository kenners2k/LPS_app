import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface TeamData {
  id: number;
  name: string;
  tla: string;
  crest: string;
}

interface Fixture {
  id: number;
  external_id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  kickoff: string;
  status: string;
  selected: boolean;
  winner: string | null;
  season_id: number;
  homeTeam: TeamData;
  awayTeam: TeamData;
}

export default function FixturesPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: fixtures, isLoading: fixturesLoading } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures/all"],
  });

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

  const filteredFixtures = fixtures?.filter(fixture => {
    const matchesStatus = statusFilter === "ALL" || fixture.status === statusFilter;
    const matchesSearch = !searchTerm || 
      fixture.homeTeam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fixture.awayTeam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fixture.homeTeam.tla.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fixture.awayTeam.tla.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent">
            All Fixtures
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Fixtures</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="LIVE">Live</SelectItem>
                    <SelectItem value="FINISHED">Finished</SelectItem>
                    <SelectItem value="POSTPONED">Postponed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFixtures?.map((fixture) => (
            <Card key={fixture.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(fixture.kickoff), "MMM d, HH:mm")}
                  </span>
                  <span className={
                    fixture.status === "LIVE" ? "text-green-500 font-medium text-sm" :
                    fixture.status === "FINISHED" ? "text-muted-foreground text-sm" :
                    fixture.status === "POSTPONED" ? "text-red-500 text-sm" :
                    "text-foreground text-sm"
                  }>
                    {fixture.status}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
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
                    {fixture.status === "FINISHED" ? (
                      `${fixture.home_score ?? 0} - ${fixture.away_score ?? 0}`
                    ) : (
                      "vs"
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-1 justify-end">
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}