import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { Model, Vec3, Mesh } from "../src/index.js";
import { fileURLToPath } from "node:url";

test("detects unused vertices in a mesh", (t) => {
  const input = readFileSync(
    fileURLToPath(new URL("plane-unused-vertices.txt", import.meta.url)),
    "utf8"
  );
  const model = Model.parse(input);
  const mesh = model.meshes[0];
  const unusedIndices = Mesh.getUnusedIndices(mesh);
  assert.deepEqual([...unusedIndices], [4, 5, 6]);
  const unusedVertices = [...unusedIndices].map((i) => mesh.vertices[i]);
  assert.deepStrictEqual(
    [...unusedVertices],
    [Vec3.create(1, 1, 1), Vec3.create(2, 2, 2), Vec3.create(3, 3, 3)]
  );

  assert.deepStrictEqual(Mesh.withoutUnusedVertices(mesh).vertices, [
    Vec3.create(-1, 0, -1),
    Vec3.create(1, 0, -1),
    Vec3.create(-1, 0, 1),
    Vec3.create(1, 0, 1),
  ]);
});

test("detects unused vertices in a model", (t) => {});
