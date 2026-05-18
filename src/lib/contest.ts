import type { PrismaClient } from "@prisma/client";

import { appEnv } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

export function defaultContestPayload() {
  return {
    title: appEnv.contestTitle,
    instagramAccount1: appEnv.instagramAccount1,
    instagramAccount2: appEnv.instagramAccount2,
    status: "active" as const,
  };
}

export async function getOrCreateActiveContest(db: PrismaClient = getPrisma()) {
  const activeContest = await db.contest.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });

  if (activeContest) {
    return activeContest;
  }

  return db.contest.create({
    data: defaultContestPayload(),
  });
}

export function participantIntroText(account1: string, account2: string): string {
  return [
    "Привет! Это бот конкурса.",
    "",
    "Чтобы участвовать, нужно:",
    `1. Подписаться на Instagram: @${account1}`,
    `2. Подписаться на Instagram: @${account2}`,
    "3. Указать здесь свой Instagram-ник",
    "",
    "Перед розыгрышем мы проверим подписки по официальным спискам подписчиков Instagram.",
  ].join("\n");
}

export function contestTermsText(account1: string, account2: string): string {
  return [
    "Условия конкурса:",
    "",
    `1. Подпишись на Instagram: @${account1}`,
    `2. Подпишись на Instagram: @${account2}`,
    "3. После этого нажми «Я выполнил условия» и отправь свой Instagram-ник.",
    "",
    "Важно: Instagram-ник должен оставаться неизменным до окончания конкурса.",
  ].join("\n");
}

export function askInstagramText(): string {
  return [
    "Отправь свой Instagram-ник, с которого ты подписался на оба аккаунта.",
    "",
    "Например: @znamteam",
  ].join("\n");
}

export function acceptedEntryText(): string {
  return [
    "Заявка принята ✅",
    "",
    "Мы проверим подписки по официальной выгрузке подписчиков Instagram.",
    "Если к финальной проверке твой ник будет найден в подписчиках обоих аккаунтов, ты попадёшь в розыгрыш.",
  ].join("\n");
}

export function middleReminderText(account1: string, account2: string): string {
  return [
    "Привет! Пока не все условия конкурса выполнены.",
    "",
    "Чтобы участвовать в розыгрыше, нужно быть подписанным на оба Instagram-аккаунта:",
    "",
    `@${account1}`,
    `@${account2}`,
    "",
    "Если ты уже подписался — проверь, что в боте указан правильный Instagram-ник.",
    "Финальная проверка пройдёт перед розыгрышем.",
  ].join("\n");
}

export function statusText(status: string): string {
  if (status === "approved_final" || status === "winner_candidate" || status === "winner") {
    return [
      "Участие подтверждено ✅",
      "",
      "На последней проверке твой Instagram-ник найден в подписчиках обоих аккаунтов.",
    ].join("\n");
  }

  if (status === "approved_start" || status === "approved_middle") {
    return [
      "Сейчас участие подтверждено ✅",
      "",
      "Финальная проверка перед розыгрышем всё равно будет решающей.",
    ].join("\n");
  }

  return [
    "Пока не все условия выполнены.",
    "",
    "Мы не видим твой Instagram-ник в подписчиках одного или обоих аккаунтов.",
    "Проверь подписки и убедись, что в боте указан правильный Instagram-ник.",
  ].join("\n");
}
