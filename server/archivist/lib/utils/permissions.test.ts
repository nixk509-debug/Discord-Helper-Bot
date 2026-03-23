import test from "node:test";
import assert from "node:assert/strict";
import { parsePermissionList } from "./permissions";

test("parsePermissionList resolves known permissions", () => {
  const parsed = parsePermissionList("ManageChannels, send_messages");
  assert.deepEqual(parsed.invalid, []);
  assert.equal(parsed.names.includes("ManageChannels"), true);
  assert.equal(parsed.names.includes("SendMessages"), true);
});

test("parsePermissionList reports invalid permissions", () => {
  const parsed = parsePermissionList("ManageChannels,NotReal");
  assert.deepEqual(parsed.invalid, ["NotReal"]);
});
