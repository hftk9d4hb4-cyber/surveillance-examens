"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AvailabilityStatus, HalfDay } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { parseIsoDate } from "@/lib/validation";

const validStatuses = new Set(["UNAVAILABLE", "WEAK_AVAILABLE", "AVAILABLE", "STRONG_AVAILABLE"]);

export async function saveAvailabilities(formData: FormData) {
  const { user } = await requireUser();
  const requested: { date: Date; halfDay: HalfDay; status: string }[] = [];
  for (const [key, rawValue] of formData.entries()) {
    if (!key.startsWith("availability__")) continue;
    const [, dateText, halfDayText] = key.split("__");
    const date = dateText ? parseIsoDate(dateText) : null;
    if (!date || !["AM", "PM"].includes(halfDayText)) continue;
    requested.push({ date, halfDay: halfDayText as HalfDay, status: String(rawValue) });
  }
  const validSlots = await prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      OR: requested.map((item) => ({ date: item.date, halfDay: item.halfDay }))
    },
    select: { date: true, halfDay: true }
  });
  const slotSet = new Set(validSlots.map((item) => `${item.date.toISOString().slice(0, 10)}|${item.halfDay}`));
  const operations = requested.flatMap((item) => {
    const slotKey = `${item.date.toISOString().slice(0, 10)}|${item.halfDay}`;
    if (!slotSet.has(slotKey)) return [];
    const where = { userId_date_halfDay: { userId: user.id, date: item.date, halfDay: item.halfDay } };
    if (!item.status) return [prisma.availability.deleteMany({ where: where.userId_date_halfDay })];
    if (!validStatuses.has(item.status)) return [];
    return [prisma.availability.upsert({
      where,
      update: { status: item.status as AvailabilityStatus },
      create: { userId: user.id, date: item.date, halfDay: item.halfDay, status: item.status as AvailabilityStatus }
    })];
  });
  if (operations.length) await prisma.$transaction(operations);
  revalidatePath("/availability");
  redirect("/availability?saved=1");
}
