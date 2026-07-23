import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCampaignOperationalRows,
  campaignExportFileName,
  type CampaignOperationalExportInput
} from "../lib/operational-export";

const date = new Date("2027-01-10T00:00:00.000Z");
const generatedAt = new Date("2027-01-05T09:30:00.000Z");

const input: CampaignOperationalExportInput = {
  generatedAt,
  campaign: {
    name: "DFASM 1 — Janvier",
    academicYear: "2026-2027",
    promotion: "DFASM1",
    status: "ASSIGNING",
    startDate: date,
    endDate: date,
    manager: { name: "Gestionnaire Test" }
  },
  kpis: {
    exams: 1,
    requiredPosts: 2,
    assignedPosts: 1,
    sentConvocations: 1,
    respondingTeachers: 1,
    totalTeachers: 2,
    missingAvailability: 1,
    coveragePercent: 50,
    availabilityPercent: 50,
    convocationPercent: 100,
    progressPercent: 64
  },
  exams: [{
    id: "exam-1",
    title: "Anatomie",
    date,
    halfDay: "AM",
    startTime: "08:00",
    endTime: "10:00",
    promotion: "DFASM1",
    location: "Amphi 1",
    requiredSupervisors: 2,
    status: "PUBLISHED",
    assignments: [{
      id: "assignment-1",
      source: "MANUAL",
      locked: true,
      user: {
        id: "teacher-1",
        name: "Alice Martin",
        email: "alice@example.fr",
        department: "Chirurgie"
      },
      convocation: { status: "SENT", sentAt: generatedAt },
      acknowledgement: { acknowledgedAt: generatedAt }
    }]
  }],
  teachers: [
    {
      id: "teacher-1",
      name: "Alice Martin",
      email: "alice@example.fr",
      department: "Chirurgie",
      quotaAnnual: 3
    },
    {
      id: "teacher-2",
      name: "Bob Durand",
      email: "bob@example.fr",
      department: null,
      quotaAnnual: null
    }
  ],
  respondingTeacherIds: new Set(["teacher-1"]),
  annualAssignmentCounts: new Map([["teacher-1", 2]]),
  alerts: [{
    severity: "CRITICAL",
    type: "UNDERSTAFFED_EXAM",
    title: "Examen sous-doté",
    message: "Un poste manque.",
    createdAt: generatedAt,
    resolvedAt: null
  }],
  changes: [{
    type: "SCHEDULE_OR_LOCATION",
    status: "APPLIED",
    reason: "Changement de salle",
    affectedUserIds: ["teacher-1"],
    notificationErrors: 0,
    requestedBy: { name: "Gestionnaire Test" },
    exam: { title: "Anatomie", date },
    createdAt: generatedAt,
    appliedAt: generatedAt
  }]
};

test("génère un nom de fichier Excel stable et sûr", () => {
  assert.equal(
    campaignExportFileName("DFASM 1 — Janvier / Épreuve", generatedAt),
    "pilotage-dfasm-1-janvier-epreuve-2027-01-05.xlsx"
  );
});

test("construit la synthèse opérationnelle de la campagne", () => {
  const rows = buildCampaignOperationalRows(input);
  assert.ok(rows.summary.some((row) => row.indicator === "Couverture" && row.value === "50 %"));
  assert.ok(rows.summary.some((row) => row.indicator === "Prises de connaissance" && row.value === "1/1"));
  assert.ok(rows.summary.some((row) => row.indicator === "Alertes critiques actives" && row.value === 1));
});

test("signale les postes manquants dans le planning", () => {
  const rows = buildCampaignOperationalRows(input);
  assert.equal(rows.planning.length, 1);
  assert.equal(rows.planning[0].missing, 1);
  assert.equal(rows.planning[0].coverage, "50 %");
  assert.equal(rows.planning[0].teachers, "Alice Martin");
});

test("consolide convocations, confirmations et quotas par enseignant", () => {
  const rows = buildCampaignOperationalRows(input);
  assert.equal(rows.assignments[0].convocation, "Envoyée");
  assert.equal(rows.assignments[0].acknowledgement, "Confirmée");
  assert.deepEqual(
    rows.loads.map((row) => ({
      teacher: row.teacher,
      availability: row.availability,
      campaign: row.campaignAssignments,
      annual: row.annualAssignments,
      remaining: row.remaining
    })),
    [
      { teacher: "Alice Martin", availability: "Réponse reçue", campaign: 1, annual: 2, remaining: 1 },
      { teacher: "Bob Durand", availability: "Sans réponse", campaign: 0, annual: 0, remaining: "" }
    ]
  );
});

test("exporte les alertes et modifications post-convocation", () => {
  const rows = buildCampaignOperationalRows(input);
  assert.equal(rows.alerts[0].status, "Active");
  assert.equal(rows.alerts[0].severity, "Critique");
  assert.equal(rows.changes[0].type, "Horaire ou lieu");
  assert.equal(rows.changes[0].affectedTeachers, 1);
});
