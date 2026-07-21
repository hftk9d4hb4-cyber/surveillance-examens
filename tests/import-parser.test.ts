import test from "node:test";
import assert from "node:assert/strict";
import { parseExamRows, parseTeacherRows } from "@/lib/imports";

test("importe un enseignant avec en-têtes français", () => {
  const result = parseTeacherRows([{ nom: "Durand", prenom: "Anne", email: "ANNE@EXEMPLE.FR", service: "Chirurgie", specialite: "Digestif", quota_annuel: 4, actif: "Oui" }]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data[0].email, "anne@exemple.fr");
  assert.equal(result.data[0].name, "Anne Durand");
  assert.equal(result.data[0].quotaAnnual, 4);
});

test("signale une adresse électronique invalide", () => {
  const result = parseTeacherRows([{ nom: "Durand", email: "invalide" }]);
  assert.equal(result.data.length, 0);
  assert.equal(result.errors.length, 1);
});

test("importe un examen et calcule l'année universitaire", () => {
  const result = parseExamRows([{ date: "15/10/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 8, heure_debut: "08:00", heure_fin: "12:00" }]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data[0].halfDay, "AM");
  assert.equal(result.data[0].academicYear, "2026-2027");
  assert.equal(result.data[0].requiredSupervisors, 8);
});

test("refuse une date civile inexistante", () => {
  const result = parseExamRows([{ date: "31/02/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 2 }]);
  assert.equal(result.data.length, 0);
  assert.ok(result.errors.some((error) => error.message.includes("inexistante")));
});

test("refuse une heure hors plage", () => {
  const result = parseExamRows([{ date: "15/10/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 2, heure_debut: "25:00", heure_fin: "26:00" }]);
  assert.equal(result.data.length, 0);
  assert.ok(result.errors.some((error) => error.message.includes("Horaires")));
});

test("refuse une heure de fin antérieure au début", () => {
  const result = parseExamRows([{ date: "15/10/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 2, heure_debut: "12:00", heure_fin: "08:00" }]);
  assert.equal(result.data.length, 0);
});

test("refuse une année universitaire incohérente", () => {
  const result = parseExamRows([{ date: "15/10/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 2, annee_universitaire: "2025-2026" }]);
  assert.equal(result.data.length, 0);
  assert.ok(result.errors.some((error) => error.message.includes("2026-2027")));
});

test("signale une adresse électronique dupliquée dans le fichier", () => {
  const result = parseTeacherRows([
    { nom: "Durand", prenom: "Anne", email: "anne@example.fr" },
    { nom: "Durand", prenom: "Anne", email: "anne@example.fr" }
  ]);
  assert.equal(result.data.length, 1);
  assert.ok(result.errors.some((error) => error.message.includes("dupliquée")));
});

test("signale un examen dupliqué dans le fichier", () => {
  const row = { date: "15/10/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 2 };
  const result = parseExamRows([row, row]);
  assert.equal(result.data.length, 1);
  assert.ok(result.errors.some((error) => error.message.includes("dupliqué")));
});

test("conserve le numéro de ligne source pour les lignes valides", () => {
  const teachers = parseTeacherRows([
    { nom: "Durand", prenom: "Anne", email: "anne@example.fr" },
    { nom: "Martin", prenom: "Paul", email: "paul@example.fr" }
  ]);
  const exams = parseExamRows([
    { date: "15/10/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 2 }
  ]);
  assert.equal(teachers.data[1].sourceRow, 3);
  assert.equal(exams.data[0].sourceRow, 2);
});

test("refuse les quotas et besoins non entiers", () => {
  const teachers = parseTeacherRows([{ nom: "Durand", email: "anne@example.fr", quota_annuel: 2.5 }]);
  const exams = parseExamRows([{ date: "15/10/2026", demi_journee: "Matin", intitule: "ECOS", promotion: "DFASM2", lieu: "Faculté", nb_surveillants: 2.5 }]);
  assert.equal(teachers.data.length, 0);
  assert.ok(teachers.errors.some((error) => error.message.includes("entier")));
  assert.equal(exams.data.length, 0);
  assert.ok(exams.errors.some((error) => error.message.includes("entier")));
});

test("refuse les champs d’examen dépassant les limites applicatives", () => {
  const result = parseExamRows([{
    date: "15/10/2026",
    demi_journee: "Matin",
    intitule: "E".repeat(181),
    promotion: "DFASM2",
    lieu: "Faculté",
    nb_surveillants: 2
  }]);
  assert.equal(result.data.length, 0);
  assert.ok(result.errors.some((error) => error.message.includes("180 caractères")));
});

test("refuse les champs enseignants dépassant les limites applicatives", () => {
  const result = parseTeacherRows([{
    nom_complet: "N".repeat(181),
    email: "anne@example.fr"
  }]);
  assert.equal(result.data.length, 0);
  assert.ok(result.errors.some((error) => error.message.includes("180 caractères")));
});
