import test from "node:test";
import assert from "node:assert/strict";
import { passwordSchema } from "@/lib/password";

test("accepte un mot de passe conforme", () => {
  assert.equal(passwordSchema.safeParse("Faculte-2026!").success, true);
});

test("refuse les mots de passe trop courts ou incomplets", () => {
  assert.equal(passwordSchema.safeParse("Court1!").success, false);
  assert.equal(passwordSchema.safeParse("sansmajuscule2026!").success, false);
  assert.equal(passwordSchema.safeParse("SansChiffre!").success, false);
  assert.equal(passwordSchema.safeParse("SansSpecial2026").success, false);
});
