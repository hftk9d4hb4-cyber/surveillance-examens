import { test } from "node:test";
import assert from "node:assert/strict";
import { fingerprint, parseStaffRows, signPreview, verifyPreview } from "../lib/staff-import";

test("creates valid rows, normalizes email, enforces MANAGER", () => {
  const result = parseStaffRows([{ prenom: "Marie", nom: "Dupont", email: "MARIE@EXAMPLE.ORG", service: "Scolarité", role: "MANAGER" }]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data[0].email, "marie@example.org");
});
test("rejects role escalation and duplicates", () => {
  const result = parseStaffRows([
    { prenom: "A", nom: "B", email: "a@example.org", role: "ADMIN" },
    { prenom: "A", nom: "B", email: "a@example.org", role: "MANAGER" }
  ]);
  assert.ok(result.errors.some(e => e.message.includes("MANAGER")));
  assert.ok(result.errors.some(e => e.message.includes("double")));
});
test("preview token bound to file and administrator and expires", () => {
  const hash = fingerprint(Buffer.from("test"));
  const token = signPreview(hash, "admin1", "secret", 1_000_000);
  assert.equal(verifyPreview(token, hash, "admin1", "secret", 1_000_100), true);
  assert.equal(verifyPreview(token, hash, "admin2", "secret", 1_000_100), false);
  assert.equal(verifyPreview(token, fingerprint(Buffer.from("other")), "admin1", "secret", 1_000_100), false);
  assert.equal(verifyPreview(token, hash, "admin1", "secret", 2_000_000), false);
});
