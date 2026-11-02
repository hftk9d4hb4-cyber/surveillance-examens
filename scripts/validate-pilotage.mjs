import assert from "node:assert/strict";
import ExcelJS from "exceljs";

function hiddenForm(html, predicate) {
  const fragment = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(m => m[0]).find(predicate);
  assert.ok(fragment, "Expected form is rendered");
  const decode = v => v.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
  const data = new FormData();
  for (const m of fragment.matchAll(/<input\b[^>]*>/g)) {
    if (!/type="hidden"/.test(m[0])) continue;
    const name = m[0].match(/name="([^"]*)"/)?.[1];
    const value = m[0].match(/value="([^"]*)"/)?.[1] || "";
    if (name) data.append(decode(name), decode(value));
  }
  return data;
}

export async function validatePilotage({ prisma, request, teacherJar, managerJar, mails, smtpControl }) {
  const manager = (await (await request("/api/auth/session", {}, managerJar)).json()).user;
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.invalid" } });
  const other = await prisma.user.create({ data: { name: "Other Manager", email: "other.manager@example.invalid", role: "MANAGER", mustChangePassword: false, passwordHash: admin.passwordHash } });
  const campaignData = { academicYear: "2040-2041", promotion: "Test", startDate: new Date("2040-11-10T00:00:00Z"), endDate: new Date("2040-11-11T00:00:00Z"), status: "ASSIGNING" };
  const campaign = await prisma.campaign.create({ data: { ...campaignData, name: "Pilotage fixture", managerId: manager.id } });
  const foreign = await prisma.campaign.create({ data: { ...campaignData, name: "Private foreign fixture", managerId: other.id } });
  const t1 = await prisma.user.create({ data: { name: "Pilot Teacher One", email: "pilot.one@example.invalid", role: "TEACHER", mustChangePassword: false, passwordHash: admin.passwordHash, quotaAnnual: 1 } });
  const t2 = await prisma.user.create({ data: { name: "Pilot Teacher Two", email: "pilot.two@example.invalid", role: "TEACHER", mustChangePassword: false, passwordHash: admin.passwordHash, quotaAnnual: 0 } });
  const examData = { date: campaignData.startDate, halfDay: "AM", startTime: "08:00", endTime: "12:00", academicYear: "2040-2041", promotion: "Test", location: "Test", requiredSupervisors: 2 };
  const exam = await prisma.exam.create({ data: { ...examData, title: "Pilot Exam", campaignId: campaign.id, assignments: { create: [{ userId: t1.id, score: 80, scoreDetails: { availability: "AVAILABLE", availabilityPoints: 30, quotaPoints: 20, weightedLoadBefore: 0, assignmentWeight: 1.5 } }] } } });
  const url = `/api/preparation?campaignId=${campaign.id}`;
  const report = async () => (await request(url)).json();
  assert.equal((await request(url, {}, new Map())).status, 403);
  assert.equal((await request(url, {}, teacherJar)).status, 403);
  assert.equal((await request(url, {}, managerJar)).status, 200);
  assert.equal((await request(`/api/preparation?campaignId=${foreign.id}`, {}, managerJar)).status, 403);
  const portfolio = await (await request("/preparation", {}, managerJar)).text();
  assert.ok(portfolio.includes("Pilotage fixture")); assert.ok(!portfolio.includes("Private foreign fixture"));
  const mailCount = mails.length;
  let r = await report(); assert.equal(r.missingPosts, 1); assert.equal(r.ready, false);
  const blocked = await request("/api/convocations/send", { method: "POST", body: new URLSearchParams({ examId: exam.id, academicYear: "2040-2041" }) });
  assert.equal(blocked.status, 303); assert.match(blocked.headers.get("location"), /error=preflight/); assert.equal(mails.length, mailCount);
  await prisma.assignment.create({ data: { examId: exam.id, userId: t2.id, score: 999, source: "MANUAL" } });
  for (const t of [t1, t2]) await prisma.availability.create({ data: { userId: t.id, date: examData.date, halfDay: "AM", status: "AVAILABLE" } });
  r = await report(); assert.equal(r.ready, true); assert.ok(r.warnings.some(i => i.code === "QUOTA"));
  const conflict = await prisma.exam.create({ data: { ...examData, title: "External conflict", campaignId: foreign.id, assignments: { create: [{ userId: t1.id, score: 0 }] } } });
  assert.ok((await report()).blockers.some(i => i.code === "CONFLICT"));
  await prisma.exam.delete({ where: { id: conflict.id } });
  await prisma.user.update({ where: { id: t2.id }, data: { isActive: false } });
  assert.ok((await report()).blockers.some(i => i.code === "INACTIVE"));
  await prisma.user.update({ where: { id: t2.id }, data: { isActive: true } });
  const reviewUrl = `/campaigns/${campaign.id}/review`;
  const review = await (await request(reviewUrl)).text();
  assert.match(review, /Contrôle avant publication/);
  const missingConfirmation = hiddenForm(review, f => f.includes('name="reviewConfirmed"'));
  await request(reviewUrl, { method: "POST", body: missingConfirmation });
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status, "ASSIGNING");
  const confirmed = hiddenForm(review, f => f.includes('name="reviewConfirmed"'));
  confirmed.set("reviewConfirmed", "true");
  // Recheck at submission, including changes made after the displayed report.
  await prisma.availability.update({ where: { userId_date_halfDay: { userId: t1.id, date: examData.date, halfDay: "AM" } }, data: { status: "UNAVAILABLE" } });
  await request(reviewUrl, { method: "POST", body: confirmed });
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status, "ASSIGNING");
  await prisma.availability.update({ where: { userId_date_halfDay: { userId: t1.id, date: examData.date, halfDay: "AM" } }, data: { status: "AVAILABLE" } });
  await request(reviewUrl, { method: "POST", body: confirmed });
  assert.equal((await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } })).status, "PUBLISHED");
  assert.equal(mails.length, mailCount, "Publishing sends no mail");
  const sent = await request("/api/convocations/send", { method: "POST", body: new URLSearchParams({ examId: exam.id }) }, managerJar);
  assert.equal(sent.status, 303); assert.match(sent.headers.get("location"), /sent=2&failed=0/);
  assert.equal(mails.length, mailCount + 2); r = await report(); assert.equal(r.pendingConvocations, 0); assert.equal(r.pendingAcknowledgements, 2);
  const assignments = await prisma.assignment.findMany({ where: { examId: exam.id } });
  await prisma.assignmentAcknowledgement.create({ data: { assignmentId: assignments[0].id, userId: assignments[0].userId } });
  assert.equal((await report()).pendingAcknowledgements, 1);
  const assignmentsHtml = await (await request("/assignments?year=2040-2041")).text();
  assert.ok(assignmentsHtml.includes("Comprendre cette affectation")); assert.ok(assignmentsHtml.includes("Affectation manuelle")); assert.ok(assignmentsHtml.includes("30.0 point"));
  const stats = await (await request("/statistics?year=2040-2041")).text();
  assert.ok(stats.includes("Bilan annuel d’équité"));
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(await (await request("/api/export/statistics?year=2040-2041")).arrayBuffer()));
  assert.ok(book.getWorksheet("Équité"));
  assert.equal((await request("/guide", {}, managerJar)).status, 200);
  assert.match(await (await request("/guide")).text(), /6. Faire le bilan annuel/);
  const forbiddenGuide = await request("/guide", {}, teacherJar); assert.equal(forbiddenGuide.status, 307);
  const expiring = await prisma.user.create({ data: { name: "Expired fixture", email: "expired@example.invalid", role: "TEACHER", activationSentAt: new Date(0), activationTokens: { create: { tokenHash: "expired-fixture-only", expiresAt: new Date(0) } } } });
  const expiredPage = await (await request("/admin/activations?state=EXPIRED")).text();
  assert.match(expiredPage, /Expired fixture/); assert.doesNotMatch(expiredPage, /expired-fixture-only/);
  assert.equal((await request("/admin/activations", {}, managerJar)).status, 307);
  const sendActivation = () => request("/api/users/send-activations", { method: "POST", body: new URLSearchParams({ targetRole: "TEACHER", userId: expiring.id, resend: "true", returnTo: "activations" }) });
  await sendActivation(); assert.equal(mails.length, mailCount + 3);
  assert.equal(await prisma.auditLog.count({ where: { entityId: expiring.id, action: "ACCOUNT_ACTIVATION_SENT" } }), 1);
  smtpControl.fail = true;
  try { await sendActivation(); } finally { smtpControl.fail = false; }
  assert.equal(mails.length, mailCount + 3);
  assert.equal(await prisma.auditLog.count({ where: { entityId: expiring.id, action: "ACCOUNT_ACTIVATION_FAILED" } }), 1);
  const failedPage = await (await request("/admin/activations?state=FAILED")).text(); assert.match(failedPage, /Expired fixture/);
  const before = await prisma.auditLog.count(); await request(url); assert.equal(await prisma.auditLog.count(), before, "Report GET is read only");
  console.log("PR15 integration passed: scoped preparation, live publication checks, blocked sends, local SMTP success/failure, activations, stored explanations, equity XLSX, guide and role access.");
}
