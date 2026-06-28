import nodemailer from "nodemailer";
import type { Exam, User } from "@prisma/client";
import { generateConvocationIcs, examStartEnd } from "@/lib/calendar";

export function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    // Mode développement : le message est généré mais non envoyé à un serveur externe.
    return nodemailer.createTransport({ streamTransport: true, newline: "unix", buffer: true });
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
  const from = process.env.MAIL_FROM ?? "Scolarité <scolarite@faculte.fr>";
  const ics = generateConvocationIcs(exam, teacher);
  const dateLabel = start.toLocaleDateString("fr-FR", { dateStyle: "full" });
  const startLabel = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return createTransporter().sendMail({
    from,
    to: teacher.email,
    subject: `Convocation surveillance d’examen - ${exam.title}`,
    text: `Bonjour ${teacher.name},\n\nVous êtes convoqué(e) pour une surveillance d’examen.\n\nExamen : ${exam.title}\nPromotion : ${exam.promotion}\nDate : ${dateLabel}\nHoraire : ${startLabel} - ${endLabel}\nLieu : ${exam.location}\n\nUne invitation calendrier est jointe à ce message.\n\nBien cordialement,\nLa scolarité`,
    html: `<p>Bonjour ${teacher.name},</p><p>Vous êtes convoqué(e) pour une surveillance d’examen.</p><ul><li><strong>Examen :</strong> ${exam.title}</li><li><strong>Promotion :</strong> ${exam.promotion}</li><li><strong>Date :</strong> ${dateLabel}</li><li><strong>Horaire :</strong> ${startLabel} - ${endLabel}</li><li><strong>Lieu :</strong> ${exam.location}</li></ul><p>Une invitation calendrier est jointe à ce message.</p><p>Bien cordialement,<br/>La scolarité</p>`,
    icalEvent: { filename: "convocation.ics", method: "REQUEST", content: ics },
    attachments: [{ filename: "convocation.ics", content: ics, contentType: "text/calendar; charset=utf-8; method=REQUEST" }]
  });
}
