import nodemailer from "nodemailer";
import type { Exam, User } from "@prisma/client";
import { generateConvocationIcs, examStartEnd } from "@/lib/calendar";

export function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  });
}

export async function sendConvocationMail(exam: Exam, teacher: User) {
  const { start, end } = examStartEnd(exam);
  const from =
    process.env.MAIL_FROM ??
    "Surveillance des examens <scolarite@faculte.fr>";
  const ics = generateConvocationIcs(exam, teacher);

  return createTransporter().sendMail({
    from,
    to: teacher.email,
    subject: `Convocation surveillance d’examen - ${exam.title}`,
    text:
      `Bonjour ${teacher.name},\n\n` +
      `Vous êtes convoqué(e) pour une surveillance d’examen.\n\n` +
      `Examen : ${exam.title}\n` +
      `Promotion : ${exam.promotion}\n` +
      `Date : ${start.toLocaleDateString("fr-FR")}\n` +
      `Horaire : ${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` +
      ` - ${end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}\n` +
      `Lieu : ${exam.location}\n\n` +
      `Bien cordialement,\nLa scolarité`,
    icalEvent: {
      filename: "convocation.ics",
      method: "REQUEST",
      content: ics
    },
    attachments: [
      {
        filename: "convocation.ics",
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=REQUEST"
      }
    ]
  });
}
