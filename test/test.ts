import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { Model } from "../src/index.js";
import writePicoCADFIle from "../src/write-picocad-file.js";
import { fileURLToPath } from "node:url";

test("round-trips vatfetus.txt", (t) => {
  const input = readFileSync(
    fileURLToPath(new URL("vatfetus.txt", import.meta.url)),
    "utf8"
  );
  const model = Model.parse(input);
  const actual = writePicoCADFIle(model);
  assert.equal(actual, input);
});

test("round-trip kitchensink.txt", () => {
  const input = readFileSync(
    fileURLToPath(new URL("kitchensink.txt", import.meta.url)),
    "utf8"
  );
  const model = Model.parse(input);
  const actual = writePicoCADFIle(model);
  assert.equal(actual, input);
});
