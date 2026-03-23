import test from "node:test";
import assert from "node:assert/strict";
import { parseHexColor } from "../../lib/utils/colors";

test("parseHexColor handles six-digit colors", () => {
  assert.equal(parseHexColor("#B11226"), 0xb11226);
  assert.equal(parseHexColor("bad"), null);
});
