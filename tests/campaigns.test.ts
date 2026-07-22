import assert from "node:assert/strict";
import test from "node:test";
import { campaignContainsDate, canTransitionCampaign } from "../lib/campaigns";

test("campaign status workflow accepts the expected forward transitions", () => {
  assert.equal(canTransitionCampaign("PREPARATION", "COLLECTING"), true);
  assert.equal(canTransitionCampaign("COLLECTING", "ASSIGNING"), true);
  assert.equal(canTransitionCampaign("ASSIGNING", "PUBLISHED"), true);
  assert.equal(canTransitionCampaign("PUBLISHED", "CLOSED"), true);
});

test("campaign status workflow rejects incoherent jumps", () => {
  assert.equal(canTransitionCampaign("PREPARATION", "PUBLISHED"), false);
  assert.equal(canTransitionCampaign("COLLECTING", "PUBLISHED"), false);
  assert.equal(canTransitionCampaign("CLOSED", "PUBLISHED"), false);
});

test("campaign can be reopened explicitly from closed to preparation", () => {
  assert.equal(canTransitionCampaign("CLOSED", "PREPARATION"), true);
});

test("campaign date boundaries are inclusive", () => {
  const start = new Date("2026-09-01T00:00:00.000Z");
  const end = new Date("2026-09-30T00:00:00.000Z");
  assert.equal(campaignContainsDate(start, end, new Date("2026-09-01T00:00:00.000Z")), true);
  assert.equal(campaignContainsDate(start, end, new Date("2026-09-30T00:00:00.000Z")), true);
  assert.equal(campaignContainsDate(start, end, new Date("2026-10-01T00:00:00.000Z")), false);
});
