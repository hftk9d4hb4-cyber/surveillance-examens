import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Exam, User } from "@prisma/client";
import { baseUrl, smtpConfigured } from "@/lib/env";
import { generateConvocationIcs, examStartEnd } from "@/lib/calendar";
import { formatDate } from "@/lib/format";

export function createTransporter(): Transporter {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("La configuration SMTP est incomplète.");
    }
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true
    });
  }

  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendActivationMail(user: User, token: string) {
  const link = `${baseUrl()}/activate/${encodeURIComponent(token)}`;
  return createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: "Activation de votre compte — Surveillance des examens",
    text: `Bonjour ${user.name},

Votre compte a été créé. Définissez votre mot de passe avec ce lien valable 7 jours :
${link}

Si vous n'êtes pas concerné(e), ignorez ce message.`,
    html: `<p>Bonjour ${escapeHtml(user.name)},</p><p>Votre compte de gestion des surveillances d'examens a été créé.</p><p><a href="${link}">Définir mon mot de passe</a></p><p>Ce lien est valable 7 jours. Si vous n'êtes pas concerné(e), ignorez ce message.</p>`
  });
}

export async function sendAvailabilityReminderMail(
  user: User,
  campaign: {
    name: string;
    promotion: string;
    startDate: Date;
    endDate: Date;
    responseDeadline: Date | null;
  }
) {
  const link = `${baseUrl()}/availability`;
  const deadline = campaign.responseDeadline
    ? `Merci de répondre avant le ${formatDate(campaign.responseDeadline)}.`
    : "Merci de renseigner vos disponibilités dès que possible.";
  return createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: `Disponibilités à compléter — ${campaign.name}`,
    text: `Bonjour ${user.name},

Vos disponibilités de surveillance sont absentes ou incomplètes pour la campagne suivante :

Campagne : ${campaign.name}
Promotion : ${campaign.promotion}
Période : ${formatDate(campaign.startDate)} au ${formatDate(campaign.endDate)}

${deadline}
${link}

Bien cordialement,
La scolarité`,
    html: `<p>Bonjour ${escapeHtml(user.name)},</p><p>Vos disponibilités de surveillance sont absentes ou incomplètes pour la campagne suivante :</p><ul><li><strong>Campagne :</strong> ${escapeHtml(campaign.name)}</li><li><strong>Promotion :</strong> ${escapeHtml(campaign.promotion)}</li><li><strong>Période :</strong> ${formatDate(campaign.startDate)} au ${formatDate(campaign.endDate)}</li></ul><p>${escapeHtml(deadline)}</p><p><a href="${link}">Renseigner mes disponibilités</a></p><p>Bien cordialement,<br>La scolarité</p>`
  });
}

export async function sendReminderEscalationMail(
  manager: User,
  teacher: User,
  campaign: { name: string; promotion: string },
  reminderCount: number
) {
  return createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: manager.email,
    subject: `Suivi requis — ${campaign.name}`,
    text: `Bonjour ${manager.name},

${teacher.name} (${teacher.email}) n’a pas finalisé l’action attendue pour la campagne ${campaign.name} — ${campaign.promotion}, malgré ${reminderCount} relances.

Merci de vérifier sa situation.

Bien cordialement,
Surveillance des examens`,
    html: `<p>Bonjour ${escapeHtml(manager.name)},</p><p><strong>${escapeHtml(teacher.name)}</strong> (${escapeHtml(teacher.email)}) n’a pas finalisé l’action attendue pour la campagne <strong>${escapeHtml(campaign.name)}</strong> — ${escapeHtml(campaign.promotion)}, malgré ${reminderCount} relances.</p><p>Merci de vérifier sa situation.</p><p>Bien cordialement,<br>Surveillance des examens</p>`
  });
}

export async function sendConvocationMail(exam: Exam, teacher: User, assignmentId: string) {
  const { start, end } = examStartEnd(exam);
  const ics = generateConvocationIcs(exam, teacher);
  const startLabel = start.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: exam.timezone
  });
  const endLabel = end.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: exam.timezone
  });
  const acknowledgementLink = `${baseUrl()}/my-convocations?assignment=${encodeURIComponent(assignmentId)}`;

  return createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: teacher.email,
    subject: `Convocation surveillance d'examen — ${exam.title}`,
    text: `Bonjour ${teacher.name},

Vous êtes convoqué(e) pour une surveillance d'examen.

Examen : ${exam.title}
Promotion : ${exam.promotion}
Date : ${formatDate(exam.date)}
Horaire : ${startLabel}–${endLabel}
Lieu : ${exam.location}

Une invitation calendrier est jointe.
Confirmez la prise de connaissance de cette convocation :
${acknowledgementLink}

Bien cordialement,
La scolarité`,
    html: `<p>Bonjour ${escapeHtml(teacher.name)},</p><p>Vous êtes convoqué(e) pour une surveillance d'examen.</p><table><tr><td><strong>Examen</strong></td><td>${escapeHtml(exam.title)}</td></tr><tr><td><strong>Promotion</strong></td><td>${escapeHtml(exam.promotion)}</td></tr><tr><td><strong>Date</strong></td><td>${formatDate(exam.date)}</td></tr><tr><td><strong>Horaire</strong></td><td>${startLabel}–${endLabel}</td></tr><tr><td><strong>Lieu</strong></td><td>${escapeHtml(exam.location)}</td></tr></table><p>Une invitation calendrier est jointe.</p><p><a href="${acknowledgementLink}">Confirmer la prise de connaissance</a></p><p>Bien cordialement,<br>La scolarité</p>`,
    icalEvent: { filename: "convocation.ics", method: "REQUEST", content: ics }
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    };
    return map[char];
  });
}
