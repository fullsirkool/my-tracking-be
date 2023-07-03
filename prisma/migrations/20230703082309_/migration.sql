-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "strava_id" INTEGER NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "sex" TEXT,
    "profile_medium" TEXT,
    "profile_long" TEXT,
    "token_type" TEXT,
    "access_token" TEXT,
    "access_token_expire_time" INTEGER NOT NULL,
    "refresh_token" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueGroup" (
    "id" SERIAL NOT NULL,
    "group_name" TEXT NOT NULL,
    "league_id" INTEGER NOT NULL,

    CONSTRAINT "LeagueGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueGroupUser" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "league_group_id" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LeagueGroupUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "moving_time" DOUBLE PRECISION NOT NULL,
    "elapsed_time" INTEGER NOT NULL,
    "total_elevation_gain" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility" TEXT NOT NULL,
    "average_speed" INTEGER NOT NULL,
    "max_speed" INTEGER NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitMetric" (
    "activity_id" INTEGER NOT NULL,
    "split" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "elapsed_time" INTEGER NOT NULL,
    "elevation_difference" DOUBLE PRECISION NOT NULL,
    "moving_time" DOUBLE PRECISION NOT NULL,
    "average_speed" DOUBLE PRECISION NOT NULL,
    "average_grade_adjusted_speed" DOUBLE PRECISION NOT NULL,
    "pace_zone" DOUBLE PRECISION NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_strava_id_key" ON "User"("strava_id");

-- CreateIndex
CREATE UNIQUE INDEX "League_id_key" ON "League"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueGroup_id_key" ON "LeagueGroup"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueGroupUser_id_key" ON "LeagueGroupUser"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_id_key" ON "Activity"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SplitMetric_activity_id_split_key" ON "SplitMetric"("activity_id", "split");

-- AddForeignKey
ALTER TABLE "LeagueGroup" ADD CONSTRAINT "LeagueGroup_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueGroupUser" ADD CONSTRAINT "LeagueGroupUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueGroupUser" ADD CONSTRAINT "LeagueGroupUser_league_group_id_fkey" FOREIGN KEY ("league_group_id") REFERENCES "LeagueGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitMetric" ADD CONSTRAINT "SplitMetric_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
