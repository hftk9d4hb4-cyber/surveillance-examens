import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { validateStatisticsExport } from "./validate-statistics-export.mjs";

// Refuse to run against any real database or externally hosted application.
for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
  const url = new URL(process.env[key]);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/surveillance_test");
}
assert.equal(process.env.CI, "true", "Run this fixture only in isolated CI");
const base = "http://localhost:3000";
const prisma = new PrismaClient();
const password = "LocalFixture2026!";
const mails = [];
const sockets = new Set();
const smtp = createServer(socket => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.setEncoding("utf8");
  socket.write("220 localhost test SMTP\r\n");
  let buffer = "";
  let message = null;
  socket.on("data", chunk => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (message !== null) {
        if (line === ".") {
          mails.push(message);
          message = null;
          socket.write("250 queued locally\r\n");
        } else message += line + "\r\n";
      } else if (/^EHLO/i.test(line)) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
      else if (/^DATA$/i.test(line)) { message = ""; socket.write("354 send message\r\n"); }
      else if (/^QUIT$/i.test(line)) socket.end("221 bye\r\n");
      else if (/^AUTH /i.test(line)) socket.write("235 authenticated\r\n");
      else socket.write("250 OK\r\n");
    }
  });
});
await new Promise(resolve => smtp.listen(1025, "127.0.0.1", resolve));
let server;
const cookies = new Map();
async function request(path, options = {}, jar = cookies) {
  const response = await fetch(base + path, {
    ...options, redirect: "manual", signal: AbortSignal.timeout(30000),
    headers: { origin: base, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), ...options.headers }
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";", 1)[0];
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return response;
}
async function login(email, jar = cookies) {
  const csrf = await (await request("/api/auth/csrf", {}, jar)).json();
  await request("/api/auth/callback/credentials", {
    method: "POST", body: new URLSearchParams({ email, password, csrfToken: csrf.csrfToken, json: "true", callbackUrl: base + "/dashboard" })
  }, jar);
  return (await request("/api/auth/session", {}, jar)).json();
}
async function upload(csv, action = "preview", token = "", jar = cookies, headers = {}) {
  const form = new FormData();
  form.set("file", new File([csv], "agents.csv", { type: "text/csv" }));
  form.set("action", action);
  form.set("token", token);
  const response = await request("/api/import/staff", { method: "POST", body: form, headers }, jar);
  return { status: response.status, json: await response.json() };
}
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

try {
  assert.equal(await prisma.user.count(), 0, "Fixture requires an empty database");
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({ data: { name: "Admin Test", email: "admin@example.invalid", role: "ADMIN", passwordHash: hash, mustChangePassword: false } });
  const teacher = await prisma.user.create({ data: { name: "Teacher Test", email: "teacher@example.invalid", role: "TEACHER", passwordHash: hash, mustChangePassword: false } });
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"], {
    stdio: "inherit", env: { ...process.env, NEXTAUTH_URL: base, SMTP_HOST: "127.0.0.1", SMTP_PORT: "1025", SMTP_USER: "fixture", SMTP_PASS: "fixture", MAIL_FROM: "test@example.invalid" }
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await request("/api/auth/csrf")).ok; } catch { /* wait for startup */ }
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, "Application started");
  assert.equal((await login(admin.email)).user.role, "ADMIN");
  const csv = "prenom;nom;email;service;role\nMarie;Test;marie@example.invalid;Scolarité;MANAGER\nJean;Test;jean@example.invalid;Scolarité;MANAGER\nChanged;Teacher;teacher@example.invalid;Changed;MANAGER\n";
  assert.equal((await upload(csv, "preview", "", new Map())).status, 403);
  const teacherJar = new Map();
  assert.equal((await login(teacher.email, teacherJar)).user.role, "TEACHER");
  const teacherBefore = await prisma.user.findUniqueOrThrow({ where: { id: teacher.id } });
  assert.equal((await upload(csv, "preview", "", teacherJar)).status, 403);
  assert.equal((await upload(csv, "preview", "", cookies, { origin: "https://other.invalid" })).status, 403);
  const preview = await upload(csv);
  assert.equal(preview.status, 200);
  assert.equal(preview.json.toCreate, 2);
  assert.equal(preview.json.existing, 1);
  assert.equal(await prisma.user.count(), 2, "Preview creates no accounts");
  assert.equal(mails.length, 0);
  assert.equal((await upload(csv + "\n", "confirm", preview.json.token)).status, 409);
  const badCsv = "prenom;nom;email;role\nA;B;a@example.invalid;ADMIN\n";
  const invalid = await upload(badCsv);
  assert.ok(invalid.json.errors > 0);
  assert.equal((await upload(badCsv, "confirm", invalid.json.token)).status, 422);
  const confirmed = await upload(csv, "confirm", preview.json.token);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.json.created, 2);
  assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: teacher.id } }), teacherBefore);
  const managers = await prisma.user.findMany({ where: { role: "MANAGER" }, orderBy: { email: "asc" } });
  assert.equal(managers.length, 2);
  for (const user of managers) { assert.equal(user.passwordHash, null); assert.equal(user.mustChangePassword, true); }
  assert.equal(mails.length, 0, "Import sends no mail");
  assert.equal((await upload(csv, "confirm", preview.json.token)).json.created, 0, "Repeated import is idempotent");
  assert.equal(await prisma.user.count(), 4);
  assert.equal(await prisma.importLog.count({ where: { kind: "STAFF" } }), 2);
  assert.equal(await prisma.auditLog.count({ where: { action: "STAFF_IMPORTED" } }), 2);
  assert.ok(!(await login(managers[0].email, new Map())).user, "Unactivated user cannot log in");
  const sent = await request("/api/users/send-activations", { method: "POST", body: new URLSearchParams({ targetRole: "MANAGER" }) });
  assert.equal(sent.status, 303);
  assert.match(sent.headers.get("location"), /activationSent=2&activationFailed=0/);
  assert.equal(mails.length, 2);
  assert.equal(await prisma.activationToken.count(), 2);
  for (const mail of mails) assert.doesNotMatch(mail, /To: teacher@example/);
  await request("/api/users/send-activations", { method: "POST", body: new URLSearchParams({ targetRole: "MANAGER" }) });
  assert.equal(mails.length, 2, "Bulk activation skips previously contacted users");
  const decodedMail = mails[0].replace(/=\r\n/g, "").replace(/=3D/g, "=");
  const path = decodedMail.match(/http:\/\/localhost:3000(\/activate\/[A-Za-z0-9_-]+)/)?.[1];
  assert.ok(path, "Activation mail includes a local link");
  const html = await (await request(path, {}, new Map())).text();
  const formHtml = html.match(/<form[^>]*>[\s\S]*?<\/form>/)?.[0];
  assert.ok(formHtml, "Activation form is available");
  const activation = new FormData();
  for (const match of formHtml.matchAll(/<input\b[^>]*>/g)) {
    const tag = match[0];
    if (!/type="hidden"/.test(tag)) continue;
    const name = tag.match(/name="([^"]*)"/)?.[1];
    const value = tag.match(/value="([^"]*)"/)?.[1] || "";
    if (name) activation.append(decode(name), decode(value));
  }
  activation.set("password", password);
  activation.set("confirm", password);
  const activated = await request(path, { method: "POST", body: activation }, new Map());
  assert.equal(activated.status, 303, "Activation redirects to login");
  assert.match(activated.headers.get("location"), /login\?activated=1/);
  const activatedUser = await prisma.user.findFirstOrThrow({ where: { role: "MANAGER", mustChangePassword: false } });
  assert.ok(await bcrypt.compare(password, activatedUser.passwordHash));
  assert.equal((await login(activatedUser.email, new Map())).user.role, "MANAGER");
  const managerJar = new Map();
  await login(activatedUser.email, managerJar);
  assert.equal((await upload(csv, "preview", "", managerJar)).status, 403);
  const page = await (await request("/admin/imports", {}, managerJar)).text();
  assert.doesNotMatch(page, /<h2>Import CSV des agents de scolarité<\/h2>/);
  assert.match(await (await request(path, {}, new Map())).text(), /Ce lien est invalide ou expiré/);
  await validateStatisticsExport({ prisma, request, teacherJar, managerJar });
  console.log("PR13 integration passed: migrations, permissions, preview, import, duplicates, account protection, audit, local mail, activation and MANAGER login.");
} finally {
  if (server) server.kill("SIGTERM");
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => smtp.close(resolve));
  await prisma.$disconnect();
}
