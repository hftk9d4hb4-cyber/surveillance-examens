import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildAnnualStatistics, selectAnnualTeachers } from "../lib/annual-statistics";
import { buildAnnualStatisticsWorkbook, annualStatisticsFilename } from "../lib/annual-statistics-export";

const stats = buildAnnualStatistics([
  { id: "e1", requiredSupervisors: 3, assignments: [
    { userId: "a", scoreDetails: { assignmentWeight: 1.5 } },
    { userId: "b", scoreDetails: null },
    { userId: "c", scoreDetails: { assignmentWeight: 2 } }
  ] }
], [
  { id: "a", name: "Alice", department: " Chirurgie & hépatologie ", quotaAnnual: 4 },
  { id: "b", name: "Bob", department: null, quotaAnnual: null },
  { id: "c", name: "Chloé", department: "Chirurgie & hépatologie", quotaAnnual: 0 },
  { id: "d", name: "Denis", department: "   ", quotaAnnual: 2 }
]);

async function roundTrip(department = "") {
  const source = buildAnnualStatisticsWorkbook(stats, "2026-2027", department);
  const result = new ExcelJS.Workbook();
  await result.xlsx.load(await source.xlsx.writeBuffer());
  return result;
}

test("filtered XLSX keeps global summaries and exports selected teachers in quota order", async () => {
  const workbook = await roundTrip("Chirurgie & hépatologie");
  const rows = workbook.getWorksheet("Enseignants")!;
  assert.equal(rows.rowCount, 3);
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => rows.getRow(2).getCell(i + 1).value), [ "Chloé", "Chirurgie & hépatologie", 1, 2, 0, -1]);
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => rows.getRow(3).getCell(i + 1).value), [ "Alice", "Chirurgie & hépatologie", 1, 1.5, 4, 3]);
  assert.equal(workbook.getWorksheet("Services")!.rowCount, 3);
  const summary = workbook.getWorksheet("Synthèse")!;
  assert.equal(summary.getCell("B1").value, "2026-2027");
  assert.equal(summary.getCell("B2").value, "Chirurgie & hépatologie");
  assert.equal(summary.getCell("B3").value, "Faculté entière");
  assert.equal(summary.getCell("B6").value, 3);
  assert.equal(summary.getCell("B10").value, 3);
  assert.equal(rows.views[0].state, "frozen");
  assert.ok(rows.autoFilter);
});

test("all services and missing department exports preserve all appropriate rows", async () => {
  const all = await roundTrip();
  assert.equal(all.getWorksheet("Enseignants")!.rowCount, 5);
  assert.equal(all.getWorksheet("Synthèse")!.getCell("B2").value, "Tous les services");
  const missing = await roundTrip("Service non renseigné");
  assert.equal(missing.getWorksheet("Enseignants")!.rowCount, 3);
  const names = [2, 3].map(i => missing.getWorksheet("Enseignants")!.getCell(`A${i}`).value);
  assert.deepEqual(names, ["Denis", "Bob"]);
  assert.equal(missing.getWorksheet("Enseignants")!.getCell("E3").value, "Non défini");
  assert.equal(missing.getWorksheet("Enseignants")!.getCell("F3").value, "—");
});

test("selection does not mutate statistics and unknown services are detectable", () => {
  const before = structuredClone(stats);
  assert.equal(selectAnnualTeachers(stats, "Inconnu").selectedDepartment, "");
  selectAnnualTeachers(stats, "Service non renseigné");
  assert.deepEqual(stats, before);
  const empty = buildAnnualStatistics([], []);
  const workbook = buildAnnualStatisticsWorkbook(empty, "2027-2028");
  assert.equal(workbook.getWorksheet("Enseignants")!.rowCount, 1);
  assert.equal(workbook.getWorksheet("Synthèse")!.getCell("B9").value, "Sans examen publié");
});

test("download filenames handle accents and cannot inject HTTP headers", () => {
  assert.equal(annualStatisticsFilename("2026-2027"), "statistiques-2026-2027.xlsx");
  assert.equal(annualStatisticsFilename("2026-2027", "Chirurgie & hépatologie"), "statistiques-2026-2027-chirurgie-hepatologie.xlsx");
  assert.doesNotMatch(annualStatisticsFilename("2026-2027", 'A\r\nB"'), /[\r\n"]/);
});
