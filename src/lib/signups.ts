import "server-only";

import { fromZonedTime } from "date-fns-tz";

import type { AppUser } from "@/lib/current-user";
import { publishLiveEvent } from "@/lib/live";
import { prisma } from "@/lib/prisma";

const TIME_ZONE = "America/New_York";
const LIVE_STATUSES = ["active", "boarded", "picked_up"] as const;

export type SignupAction = "cancelled" | "boarded" | "picked_up" | "no_show";

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function dayRange(dateText = todayInNewYork()) {
  return {
    start: fromZonedTime(`${dateText}T00:00:00`, TIME_ZONE),
    end: fromZonedTime(`${dateText}T23:59:59`, TIME_ZONE),
    dateText,
  };
}

async function audit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: unknown,
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function createSignup(user: AppUser, trainStopId: string) {
  const train = await prisma.trainStop.findUnique({ where: { id: trainStopId } });

  if (!train) {
    throw new Error("That train was not found.");
  }

  const existing = await prisma.signup.findFirst({
    where: {
      userId: user.id,
      trainStopId,
      status: { in: [...LIVE_STATUSES] },
    },
  });

  if (existing) {
    throw new Error("You already have an active signup for this train.");
  }

  const signup = await prisma.signup.create({
    data: {
      userId: user.id,
      trainStopId,
      status: "active",
    },
    include: { trainStop: true, user: true },
  });

  await prisma.shuttleRun.upsert({
    where: { trainStopId },
    update: {},
    create: { trainStopId, status: "boarding" },
  });

  await audit(user.id, "signup.created", "Signup", signup.id, {
    trainStopId,
    trainNumber: train.trainNumber,
  });
  await publishLiveEvent("signup.changed", { signupId: signup.id, trainStopId });

  return signup;
}

export async function updateSignupStatus(
  actor: AppUser,
  signupId: string,
  status: SignupAction,
) {
  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    include: { trainStop: true },
  });

  if (!signup) {
    throw new Error("Signup not found.");
  }

  const isOwner = signup.userId === actor.id;
  const studentAllowed = isOwner && (status === "cancelled" || status === "boarded");
  const ccAllowed = actor.role === "cc";

  if (!studentAllowed && !ccAllowed) {
    throw new Error("You do not have permission to change this signup.");
  }

  const now = new Date();
  const data = {
    status,
    cancelledAt: status === "cancelled" ? now : signup.cancelledAt,
    boardedAt: status === "boarded" ? now : signup.boardedAt,
    pickedUpAt: status === "picked_up" ? now : signup.pickedUpAt,
    noShowAt: status === "no_show" ? now : signup.noShowAt,
  };

  const updated = await prisma.signup.update({
    where: { id: signupId },
    data,
    include: { trainStop: true, user: true },
  });

  await audit(actor.id, `signup.${status}`, "Signup", signupId, {
    trainStopId: signup.trainStopId,
    actorRole: actor.role,
  });
  await publishLiveEvent("signup.changed", {
    signupId,
    trainStopId: signup.trainStopId,
    status,
  });

  return updated;
}

export async function markRunDeparted(
  actor: AppUser,
  trainStopId: string,
  ccNotes?: string,
) {
  if (actor.role !== "cc") {
    throw new Error("Only CCs can mark the shuttle departed.");
  }

  const run = await prisma.shuttleRun.upsert({
    where: { trainStopId },
    update: {
      status: "departed",
      departedAt: new Date(),
      ccNotes: ccNotes?.trim() || null,
    },
    create: {
      trainStopId,
      status: "departed",
      departedAt: new Date(),
      ccNotes: ccNotes?.trim() || null,
    },
  });

  await audit(actor.id, "shuttle.departed", "ShuttleRun", run.id, {
    trainStopId,
    ccNotes,
  });
  await publishLiveEvent("run.changed", { trainStopId, runId: run.id });

  return run;
}

export async function getStudentSignups(userId: string) {
  return prisma.signup.findMany({
    where: { userId },
    include: { trainStop: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTripForUser(user: AppUser, signupId: string) {
  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    include: { trainStop: true, user: true },
  });

  if (!signup) {
    return null;
  }

  if (user.role !== "cc" && signup.userId !== user.id) {
    return null;
  }

  return signup;
}

export async function getRoster(dateText?: string) {
  const range = dayRange(dateText);
  const trains = await prisma.trainStop.findMany({
    where: {
      scheduledDeparture: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      signups: {
        where: { status: { not: "cancelled" } },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      shuttleRun: true,
    },
    orderBy: { scheduledDeparture: "asc" },
  });

  return {
    dateText: range.dateText,
    trains,
  };
}

export async function getCcHistory() {
  const [runs, logs] = await Promise.all([
    prisma.shuttleRun.findMany({
      include: { trainStop: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  return { runs, logs };
}
