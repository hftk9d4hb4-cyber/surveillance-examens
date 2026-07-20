"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AvailabilityStatus, HalfDay } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";

const validStatuses = new Set(["UNAVAILABLE", "WEAK_AVAILABLE", "AVAILABLE", "STRONG_AVAILABLE"]);

export async function saveAvailabilities(formData: FormData) {
  const { user } = await requireUser();
  const operations = [];
  for (const [key, rawValue] of formData.entries()) {
    if (!key.startsWith("availability__")) continue;
    const [, dateText, halfDayText] = key.split("__");
    if (!dateText || !["AM", "PM"].includes(halfDayText)) continue;
    const status = String(rawValue);
    const date = new Date(`${dateText}T00:00:00.000Z`);
    const where = { userId_date_halfDay: { userId: user.id, date, halfDay: halfDayText as HalfDay } };
    if (!status) operations.push(prisma.availability.deleteMany({ where: where.userId_date_halfDay }));
    else if (validStatuses.has(status)) operations.push(prisma.availability.upsert({ where, update: { status: status as AvailabilityStatus }, create: { userId: user.id, date, halfDay: halfDayText as HalfDay, status: status as AvailabilityStatus } }));
  }
  if (operations.length) await prisma.$transaction(operations);
  revalidatePath("/availability");
  redirect("/availability?saved=1");
}
