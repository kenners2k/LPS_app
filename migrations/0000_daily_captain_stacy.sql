CREATE TABLE "fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer,
	"game_week_id" integer,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"kickoff" timestamp NOT NULL,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"winner" text,
	"external_season_id" integer,
	"season_id" integer NOT NULL,
	"round_id" integer,
	CONSTRAINT "fixtures_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "game_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"number" integer NOT NULL,
	"deadline" timestamp NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "game_weeks_round_id_number_unique" UNIQUE("round_id","number")
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"game_week_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"fixture_id" integer NOT NULL,
	"external_id" integer,
	"is_home_team" boolean NOT NULL,
	"is_correct" boolean,
	"picked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "picks_user_id_game_week_id_unique" UNIQUE("user_id","game_week_id")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"number" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "rounds_season_id_number_unique" UNIQUE("season_id","number")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "seasons_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"tla" text,
	"crest" text,
	CONSTRAINT "teams_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
