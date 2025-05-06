import { z } from "zod";

const scoreSchema = z.object({
  winner: z.string().nullable(),
  fullTime: z.object({
    home: z.number().nullable(),
    away: z.number().nullable(),
  }),
});

const fixtureSchema = z.object({
  id: z.number(),
  homeTeam: z.object({
    id: z.number(),
    name: z.string(),
    shortName: z.string(),
    tla: z.string(),
    crest: z.string(),
  }),
  awayTeam: z.object({
    id: z.number(),
    name: z.string(),
    shortName: z.string(),
    tla: z.string(),
    crest: z.string(),
  }),
  utcDate: z.string(),
  status: z.enum(['SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'CANCELLED', 'POSTPONED', 'TIMED']),
  score: scoreSchema,
  season: z.object({
    id: z.number(),
    currentMatchday: z.number(),
  }),
});

type Fixture = z.infer<typeof fixtureSchema>;

export async function fetchFixtures(dateFrom?: string, dateTo?: string): Promise<Fixture[]> {
  console.log('Fetching fixtures with token:', process.env.FOOTBALL_DATA_API_TOKEN?.slice(0, 4) + '...');
  console.log('Date range:', { dateFrom, dateTo });

  const url = new URL('https://api.football-data.org/v4/competitions/PL/matches');

  // Add date filters if provided
  if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
  if (dateTo) url.searchParams.set('dateTo', dateTo);

  console.log('Requesting URL:', url.toString());

  const response = await fetch(url.toString(), {
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN!,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      body: text
    });
    throw new Error(`Failed to fetch fixtures: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = await response.json();
  console.log('API Response:', JSON.stringify(data, null, 2));

  if (!data.matches) {
    console.error('Unexpected API response format:', data);
    throw new Error('Unexpected API response format: matches array not found');
  }

  return z.array(fixtureSchema).parse(data.matches);
}

export async function fetchFixture(fixtureId: number): Promise<Fixture> {
  const response = await fetch(`https://api.football-data.org/v4/matches/${fixtureId}`, {
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN!,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch fixture: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = await response.json();
  return fixtureSchema.parse(data);
}