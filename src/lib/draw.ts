import { randomInt, randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";

export async function drawWinner(contestId: string, adminId: string, db: PrismaClient = getPrisma()) {
  const eligibleEntries = await db.contestEntry.findMany({
    where: {
      contestId,
      status: "approved_final",
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  if (eligibleEntries.length === 0) {
    throw new Error("No approved_final entries are available for the draw");
  }

  const existingCandidate = await db.drawResult.findFirst({
    where: { contestId, status: "candidate" },
    orderBy: { drawnAt: "desc" },
  });

  if (existingCandidate) {
    throw new Error("A winner candidate already exists. Reject or confirm it before redrawing.");
  }

  const index = randomInt(eligibleEntries.length);
  const winner = eligibleEntries[index];
  const eligibleIds = eligibleEntries.map((entry) => entry.id);

  const drawResult = await db.$transaction(async (transaction) => {
    const created = await transaction.drawResult.create({
      data: {
        contestId,
        winnerEntryId: winner.id,
        eligibleCount: eligibleEntries.length,
        eligibleIds,
        seed: `${adminId}:${randomUUID()}`,
        status: "candidate",
      },
      include: {
        winnerEntry: {
          include: { user: true },
        },
      },
    });

    await transaction.contestEntry.update({
      where: { id: winner.id },
      data: { status: "winner_candidate" },
    });

    return created;
  });

  return drawResult;
}
