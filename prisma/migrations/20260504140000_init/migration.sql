-- This project only owns the train schedule table.
-- Other teammates can add auth, signup, and CC tables later.

CREATE TABLE "TrainStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripKey" TEXT NOT NULL,
    "stationCode" TEXT NOT NULL DEFAULT 'DNC',
    "trainNumber" TEXT NOT NULL,
    "routeName" TEXT,
    "destination" TEXT NOT NULL,
    "scheduledDeparture" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "TrainStop_tripKey_key" ON "TrainStop"("tripKey");
CREATE INDEX "TrainStop_stationCode_scheduledDeparture_idx" ON "TrainStop"("stationCode", "scheduledDeparture");
