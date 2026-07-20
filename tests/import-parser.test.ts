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
