import assert from "node:assert/strict";
import ExcelJS from "exceljs";

// Invoked only by the isolated PostgreSQL fixture, using its HTTP sessions.
export async function validateStatisticsExport({ prisma, request, teacherJar, managerJar }) {
  const service = "Chirurgie & hépatologie";
  const teacher = await prisma.user.findUniqueOrThrow({ where: { email: "teacher@example.invalid" } });
  await prisma.user.update({ where: { id: teacher.id }, data: { department: service, quotaAnnual: 4 } });
  const second = await prisma.user.create({ data: { name: "Second Teacher", email: "second@example.invalid", role: "TEACHER", department: "Médecine", quotaAnnual: 2 } });
  const exam = await prisma.exam.create({ data: {
    title: "Export fixture", date: new Date("2026-11-10T00:00:00Z"), halfDay: "AM", startTime: "08:00", endTime: "12:00", academicYear: "2026-2027", promotion: "DFASM1", location: "Test", requiredSupervisors: 2,
    assignments: { create: [{ userId: teacher.id, score: 0, scoreDetails: { assignmentWeight: 1.5 } }, { userId: second.id, score: 0 }] }
  } });
  assert.ok(exam.id);
  await prisma.exam.create({ data: {
    title: "Other year fixture", date: new Date("2025-11-10T00:00:00Z"), halfDay: "AM", startTime: "08:00", endTime: "12:00", academicYear: "2025-2026", promotion: "DFASM1", location: "Test", requiredSupervisors: 1,
    assignments: { create: [{ userId: teacher.id, score: 0 }] }
  } });
  await prisma.exam.create({ data: {
    title: "Cancelled fixture", status: "CANCELLED", date: new Date("2026-11-11T00:00:00Z"), halfDay: "AM", startTime: "08:00", endTime: "12:00", academicYear: "2026-2027", promotion: "DFASM1", location: "Test", requiredSupervisors: 1,
    assignments: { create: [{ userId: teacher.id, score: 0 }] }
  } });
  const query = new URLSearchParams({ year: "2026-2027", department: service });
  const response = await request(`/api/export/statistics?${query}`);
  assert.equal(response.status, 200);
  assert.equal((await request(`/api/export/statistics?${query}`, {}, managerJar)).status, 200);
  assert.match(response.headers.get("content-disposition"), /statistiques-2026-2027-chirurgie-hepatologie.xlsx/);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(await response.arrayBuffer()));
  assert.equal(book.getWorksheet("Enseignants").rowCount, 2);
  assert.equal(book.getWorksheet("Enseignants").getCell("A2").value, "Teacher Test");
  assert.equal(book.getWorksheet("Enseignants").getCell("D2").value, 1.5);
  assert.equal(book.getWorksheet("Synthèse").getCell("B6").value, 2);
  assert.equal(book.getWorksheet("Services").rowCount, 3);
  const page = await (await request(`/statistics?${query}`)).text();
  assert.ok(page.includes(`/api/export/statistics?${query.toString().replaceAll("&", "&amp;")}`), "Export link retains year and encoded department");
  const all = await request("/api/export/statistics?year=2026-2027");
  const allBook = new ExcelJS.Workbook();
  await allBook.xlsx.load(Buffer.from(await all.arrayBuffer()));
  assert.equal(allBook.getWorksheet("Enseignants").rowCount, 3);
  assert.equal((await request("/api/export/statistics?year=2026-2027&department=Inconnu")).status, 400);
  assert.equal((await request("/api/export/statistics?year=invalide")).status, 400);
  assert.equal((await request(`/api/export/statistics?${query}`, {}, new Map())).status, 403);
  assert.equal((await request(`/api/export/statistics?${query}`, {}, teacherJar)).status, 403);
  console.log("PR14 integration passed: selected service, full export, global summaries, encoded UI link and access controls.");
}
