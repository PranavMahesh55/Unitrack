import "server-only";

import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { fromZonedTime } from "date-fns-tz";

import { prisma } from "@/lib/prisma";

const STATION_CODE = process.env.TRAIN_STATION_CODE ?? "DNC";
const GTFS_URL =
  process.env.AMTRAK_GTFS_URL ??
  "https://content.amtrak.com/content/gtfs/GTFS.zip";
const TIME_ZONE = "America/New_York";
const HOURS_TO_SHOW = 72;

type StopRow = {
  stop_id: string;
  stop_code?: string;
};

type StopTimeRow = {
  trip_id: string;
  stop_id: string;
  departure_time?: string;
  arrival_time?: string;
};

type TripRow = {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
};

type RouteRow = {
  route_id: string;
  route_short_name?: string;
  route_long_name?: string;
};

type CalendarRow = {
  service_id: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  start_date: string;
  end_date: string;
};

type CalendarDateRow = {
  service_id: string;
  date: string;
  exception_type: string;
};

export type TrainForPage = {
  id: string;
  tripKey: string;
  stationCode: string;
  trainNumber: string;
  routeName: string | null;
  destination: string;
  scheduledDeparture: string;
  source: string;
};

type TrainToSave = Omit<TrainForPage, "id" | "scheduledDeparture"> & {
  scheduledDeparture: Date;
};

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function serviceDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}${month}${day}`;
}

function shiftServiceDate(yyyymmdd: string, days: number) {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6)) - 1;
  const day = Number(yyyymmdd.slice(6, 8));
  const shifted = new Date(Date.UTC(year, month, day + days));

  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("");
}

function gtfsTimeToDate(yyyymmdd: string, gtfsTime: string) {
  const [rawHour, minute = "0", second = "0"] = gtfsTime.split(":").map(Number);
  const extraDays = Math.floor(rawHour / 24);
  const hour = rawHour % 24;
  const date = shiftServiceDate(yyyymmdd, extraDays);
  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);
  const localTime = `${year}-${month}-${day}T${String(hour).padStart(
    2,
    "0",
  )}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;

  return fromZonedTime(localTime, TIME_ZONE);
}

function formatTrainDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export { formatTrainDate };

function readCsvFile<T>(zip: AdmZip, fileName: string): T[] {
  const file = zip.getEntry(fileName);

  if (!file) {
    return [];
  }

  return parse(file.getData().toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as T[];
}

function weekdayName(yyyymmdd: string) {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6)) - 1;
  const day = Number(yyyymmdd.slice(6, 8));

  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][new Date(Date.UTC(year, month, day)).getUTCDay()] as keyof CalendarRow;
}

function serviceRunsOnDate(
  serviceId: string,
  yyyymmdd: string,
  calendars: CalendarRow[],
  exceptions: CalendarDateRow[],
) {
  const exception = exceptions.find(
    (row) => row.service_id === serviceId && row.date === yyyymmdd,
  );

  if (exception?.exception_type === "1") {
    return true;
  }

  if (exception?.exception_type === "2") {
    return false;
  }

  const calendar = calendars.find((row) => row.service_id === serviceId);

  if (!calendar) {
    return false;
  }

  const weekday = weekdayName(yyyymmdd);

  return (
    calendar.start_date <= yyyymmdd &&
    calendar.end_date >= yyyymmdd &&
    calendar[weekday] === "1"
  );
}

async function fetchGtfsTrains(stationCode: string) {
  const response = await fetch(GTFS_URL);

  if (!response.ok) {
    throw new Error(`Could not download GTFS feed (${response.status}).`);
  }

  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const stops = readCsvFile<StopRow>(zip, "stops.txt");
  const stop = stops.find(
    (row) =>
      row.stop_id.toUpperCase() === stationCode ||
      row.stop_code?.toUpperCase() === stationCode,
  );

  if (!stop) {
    return [];
  }

  const stopTimes = readCsvFile<StopTimeRow>(zip, "stop_times.txt").filter(
    (row) => row.stop_id === stop.stop_id,
  );
  const trips = readCsvFile<TripRow>(zip, "trips.txt");
  const routes = readCsvFile<RouteRow>(zip, "routes.txt");
  const calendars = readCsvFile<CalendarRow>(zip, "calendar.txt");
  const exceptions = readCsvFile<CalendarDateRow>(zip, "calendar_dates.txt");
  const now = new Date();
  const end = addHours(now, HOURS_TO_SHOW);
  const trains: TrainToSave[] = [];
  const seen = new Set<string>();

  for (let day = 0; day < 4; day += 1) {
    const date = serviceDate(addDays(now, day));

    for (const stopTime of stopTimes) {
      const trip = trips.find((row) => row.trip_id === stopTime.trip_id);

      if (!trip || !serviceRunsOnDate(trip.service_id, date, calendars, exceptions)) {
        continue;
      }

      const departureText = stopTime.departure_time ?? stopTime.arrival_time;

      if (!departureText) {
        continue;
      }

      const departure = gtfsTimeToDate(date, departureText);

      if (departure < now || departure > end) {
        continue;
      }

      const route = routes.find((row) => row.route_id === trip.route_id);
      const trainNumber =
        trip.trip_short_name || route?.route_short_name || trip.trip_id;
      const key = `${stationCode}-${trainNumber}-${departure.toISOString()}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      trains.push({
        tripKey: key,
        stationCode,
        trainNumber,
        routeName: route?.route_long_name ?? route?.route_short_name ?? null,
        destination: trip.trip_headsign || "Unknown destination",
        scheduledDeparture: departure,
        source: "GTFS",
      });
    }
  }

  return trains.sort(
    (a, b) => a.scheduledDeparture.getTime() - b.scheduledDeparture.getTime(),
  );
}

function makeDemoTrains(stationCode: string): TrainToSave[] {
  const today = serviceDate(new Date());

  return [
    ["73", "Piedmont", "Charlotte", "09:27:00"],
    ["75", "Piedmont", "Charlotte", "13:22:00"],
    ["79", "Carolinian", "Charlotte", "17:31:00"],
    ["80", "Carolinian", "New York", "09:21:00"],
  ].map(([trainNumber, routeName, destination, time]) => {
    const departure = gtfsTimeToDate(today, time);

    return {
      tripKey: `demo-${stationCode}-${trainNumber}-${departure.toISOString()}`,
      stationCode,
      trainNumber,
      routeName,
      destination,
      scheduledDeparture: departure,
      source: "Demo",
    };
  });
}

function trainRowForPage(row: {
  id: string;
  tripKey: string;
  stationCode: string;
  trainNumber: string;
  routeName: string | null;
  destination: string;
  scheduledDeparture: Date;
  source: string;
}): TrainForPage {
  return {
    id: row.id,
    tripKey: row.tripKey,
    stationCode: row.stationCode,
    trainNumber: row.trainNumber,
    routeName: row.routeName,
    destination: row.destination,
    scheduledDeparture: row.scheduledDeparture.toISOString(),
    source: row.source,
  };
}

async function saveTrains(trains: TrainToSave[]) {
  for (const train of trains) {
    await prisma.trainStop.upsert({
      where: { tripKey: train.tripKey },
      update: {
        routeName: train.routeName,
        destination: train.destination,
        source: train.source,
      },
      create: train,
    });
  }
}

async function readSavedTrains(stationCode: string) {
  const now = new Date();
  const end = addHours(now, HOURS_TO_SHOW);
  const rows = await prisma.trainStop.findMany({
    where: {
      stationCode,
      scheduledDeparture: {
        gte: now,
        lte: end,
      },
    },
    orderBy: {
      scheduledDeparture: "asc",
    },
  });

  return rows.map(trainRowForPage);
}

export async function syncTrains(stationCode = STATION_CODE) {
  const cleanStationCode = stationCode.toUpperCase();
  let source = "GTFS";
  let trains = await fetchGtfsTrains(cleanStationCode).catch(() => {
    source = "Demo";
    return makeDemoTrains(cleanStationCode);
  });

  if (trains.length === 0) {
    source = "Demo";
    trains = makeDemoTrains(cleanStationCode);
  }

  await prisma.trainStop.deleteMany({
    where: { stationCode: cleanStationCode },
  });
  await saveTrains(trains);

  return {
    source,
    trains: await readSavedTrains(cleanStationCode),
  };
}

export async function getTrains(stationCode = STATION_CODE, forceSync = false) {
  const cleanStationCode = stationCode.toUpperCase();

  if (!forceSync) {
    const saved = await readSavedTrains(cleanStationCode);

    if (saved.length > 0) {
      return saved;
    }
  }

  const result = await syncTrains(cleanStationCode);
  return result.trains;
}
