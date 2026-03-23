import test from "node:test";
import assert from "node:assert/strict";
import { buildOverwritePatch } from "./helpers";

test("buildOverwritePatch converts allow and deny values", () => {
  const patch = buildOverwritePatch("SendMessages", "ViewChannel");
  assert.equal(patch.SendMessages, true);
  assert.equal(patch.ViewChannel, false);
});
