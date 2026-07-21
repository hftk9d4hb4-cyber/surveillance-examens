import test from "node:test";
import assert from "node:assert/strict";
import { planAssignments } from "@/lib/assignment-engine";

const teachers = [
  { id: "a", name: "Alice", quotaAnnual: 10, currentLoad: 0 },
  { id: "b", name: "Benoît", quotaAnnual: 10, currentLoad: 3 },
  { id: "c", name: "Chloé", quotaAnnual: 1, currentLoad: 1 }
];
const exams = [
  { id: "e1", date: "2026-09-01", halfDay: "AM" as const, requiredSupervisors: 1 },
  { id: "e2", date: "2026-09-01", halfDay: "PM" as const, requiredSupervisors: 1 }
];

test("exclut les indisponibilités et les quotas atteints", () => {
  const availability = new Map([
    ["a|2026-09-01|AM", "UNAVAILABLE" as const],
    ["b|2026-09-01|AM", "AVAILABLE" as const],
    ["c|2026-09-01|AM", "STRONG_AVAILABLE" as const]
  ]);
  const plan = planAssignments({ teachers, exams: [exams[0]], availabilityBySlot: availability, lockedAssignments: [] });
  assert.equal(plan.assignments.length, 1);
  assert.equal(plan.assignments[0].userId, "b");
});

test("privilégie l'enseignant le moins chargé à disponibilité égale", () => {
  const availability = new Map([
    ["a|2026-09-01|AM", "AVAILABLE" as const],
    ["b|2026-09-01|AM", "AVAILABLE" as const]
  ]);
  const plan = planAssignments({ teachers: teachers.slice(0, 2), exams: [exams[0]], availabilityBySlot: availability, lockedAssignments: [] });
  assert.equal(plan.assignments[0].userId, "a");
});

test("limite par défaut à une surveillance par jour", () => {
  const availability = new Map([
    ["a|2026-09-01|AM", "STRONG_AVAILABLE" as const],
    ["a|2026-09-01|PM", "STRONG_AVAILABLE" as const],
    ["b|2026-09-01|AM", "AVAILABLE" as const],
    ["b|2026-09-01|PM", "AVAILABLE" as const]
  ]);
  const plan = planAssignments({ teachers: teachers.slice(0, 2), exams, availabilityBySlot: availability, lockedAssignments: [] });
  assert.equal(plan.assignments.length, 2);
  assert.notEqual(plan.assignments[0].userId, plan.assignments[1].userId);
});

test("conserve une affectation verrouillée dans le besoin couvert", () => {
  const plan = planAssignments({ teachers: teachers.slice(0, 2), exams: [exams[0]], availabilityBySlot: new Map(), lockedAssignments: [{ examId: "e1", userId: "b" }] });
  assert.equal(plan.assignments.length, 0);
  assert.equal(plan.alerts.length, 0);
});

test("un quota annuel égal à zéro interdit toute affectation", () => {
  const plan = planAssignments({
    teachers: [{ id: "z", name: "Zéro", quotaAnnual: 0, currentLoad: 0 }],
    exams: [exams[0]],
    availabilityBySlot: new Map([["z|2026-09-01|AM", "STRONG_AVAILABLE" as const]]),
    lockedAssignments: []
  });
  assert.equal(plan.assignments.length, 0);
  assert.equal(plan.alerts[0].missing, 1);
});

test("produit une alerte lorsque le besoin dépasse le nombre de candidats", () => {
  const plan = planAssignments({
    teachers: teachers.slice(0, 1),
    exams: [{ ...exams[0], requiredSupervisors: 2 }],
    availabilityBySlot: new Map([["a|2026-09-01|AM", "AVAILABLE" as const]]),
    lockedAssignments: []
  });
  assert.equal(plan.assignments.length, 1);
  assert.equal(plan.alerts.length, 1);
  assert.equal(plan.alerts[0].missing, 1);
});

test("un enseignant sans réponse reste affectable après ceux disponibles", () => {
  const plan = planAssignments({
    teachers: [
      { id: "a", name: "Alice", quotaAnnual: null, currentLoad: 0 },
      { id: "b", name: "Benoît", quotaAnnual: null, currentLoad: 0 }
    ],
    exams: [{ ...exams[0], requiredSupervisors: 2 }],
    availabilityBySlot: new Map([["a|2026-09-01|AM", "AVAILABLE" as const]]),
    lockedAssignments: []
  });
  assert.equal(plan.assignments.length, 2);
  assert.equal(plan.assignments[0].userId, "a");
  assert.equal(plan.assignments[1].scoreDetails.availability, "NO_RESPONSE");
});

test("reste déterministe quand l’ordre des enseignants et examens change", () => {
  const teachersInput = [
    { id: "b", name: "Benoît", quotaAnnual: 5, currentLoad: 0 },
    { id: "a", name: "Alice", quotaAnnual: 5, currentLoad: 0 },
    { id: "c", name: "Chloé", quotaAnnual: 5, currentLoad: 0 }
  ];
  const examsInput = [
    { id: "e2", date: "2026-09-02", halfDay: "AM" as const, requiredSupervisors: 1 },
    { id: "e1", date: "2026-09-01", halfDay: "AM" as const, requiredSupervisors: 1 }
  ];
  const availability = new Map([
    ["a|2026-09-01|AM", "AVAILABLE" as const],
    ["b|2026-09-01|AM", "AVAILABLE" as const],
    ["c|2026-09-01|AM", "AVAILABLE" as const],
    ["a|2026-09-02|AM", "AVAILABLE" as const],
    ["b|2026-09-02|AM", "AVAILABLE" as const],
    ["c|2026-09-02|AM", "AVAILABLE" as const]
  ]);

  const first = planAssignments({ teachers: teachersInput, exams: examsInput, availabilityBySlot: availability, lockedAssignments: [] });
  const second = planAssignments({ teachers: [...teachersInput].reverse(), exams: [...examsInput].reverse(), availabilityBySlot: availability, lockedAssignments: [] });
  assert.deepEqual(first, second);
});
