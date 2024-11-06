import { Model, Vec3, Mesh } from "./index.js";

export type ExportObjOptions = {
  dupeAndInvertDoubledFaces: boolean;
};

function crossProduct(a: Vec3, b: Vec3): Vec3 {
  return Vec3.create(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

function normalize(v: Vec3): Vec3 {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return Vec3.create(v.x / length, v.y / length, v.z / length);
}

function transformVertex(vertex: Vec3, mesh: Mesh): Vec3 {
  return Vec3.create(
    vertex.x + mesh.pos.x,
    -(vertex.y + mesh.pos.y),
    -(vertex.z + mesh.pos.z)
  );
}

function formatNum(n: number): string {
  const precision = 4;
  return Number.isInteger(n) ? String(n) : n.toFixed(precision);
}

function formatNormal(normal: Vec3): string {
  // Adjust precision and invert the X-axis
  return `${-formatNum(normal.x)} ${formatNum(normal.y)} ${formatNum(
    normal.z
  )}`;
}

export default function writeObj(model: Model, opts: ExportObjOptions): string {
  let output = `o ${model.name}\n`;
  let vertexOffset = 0;

  const v: string[] = []; // Vertices
  const vt: string[] = []; // Texture coordinates
  const vn: string[] = []; // Vertex normals
  const f: string[] = []; // Faces

  const textureWidth = 16;
  const textureHeight = 16;

  for (const mesh of model.meshes) {
    for (const vertex of mesh.vertices) {
      const { x, y, z } = transformVertex(vertex, mesh);
      v.push(`v ${x} ${y} ${z}`);
    }

    for (const face of mesh.faces) {
      const uvIndices: number[] = [];
      for (const [u, v] of face.uvs) {
        const normalizedU = u / textureWidth;
        const normalizedV = 1 - v / textureHeight;
        vt.push(
          `vt ${
            Number.isInteger(normalizedU) ? normalizedU : normalizedU.toFixed(4)
          } ${
            Number.isInteger(normalizedV) ? normalizedV : normalizedV.toFixed(4)
          }`
        );
        uvIndices.push(vt.length);
      }

      // Calculate face normal
      const edge1: Vec3 = Vec3.create(
        mesh.vertices[face.indices[1]].x - mesh.vertices[face.indices[0]].x,
        mesh.vertices[face.indices[1]].y - mesh.vertices[face.indices[0]].y,
        mesh.vertices[face.indices[1]].z - mesh.vertices[face.indices[0]].z
      );
      const edge2: Vec3 = Vec3.create(
        mesh.vertices[face.indices[2]].x - mesh.vertices[face.indices[0]].x,
        mesh.vertices[face.indices[2]].y - mesh.vertices[face.indices[0]].y,
        mesh.vertices[face.indices[2]].z - mesh.vertices[face.indices[0]].z
      );

      const normal = normalize(crossProduct(edge1, edge2));
      // vn.push(`vn ${normal.x} ${normal.y} ${normal.z}`)
      vn.push("vn " + formatNormal(normal));

      const faceIndices = face.indices.map((i) => i + vertexOffset);
      const normalIndex = vn.length;
      const faceDef = faceIndices
        .map((fi, idx) => `${fi + 1}/${uvIndices[idx]}/${normalIndex}`)
        .reverse()
        .join(" ");
      f.push(`f ${faceDef}`);

      if (opts.dupeAndInvertDoubledFaces && face.doubleSided) {
        // Normal calculation remains the same
        const invertedNormal = normalize(crossProduct(edge2, edge1));
        vn.push("vn " + formatNormal(invertedNormal));
        const invertedNormalIndex = vn.length;

        // For the inverted face, reverse the order of vertices and uv indices directly in the face definition
        // Since we're manually reversing the order of vertices for the doubled face, we need to ensure
        // that the UV indices are arranged to correspond to the correct vertices.
        const invertedFaceDef = face.indices
          .slice()
          .reverse()
          .map((fi, idx) => {
            // The key here is to ensure we use the original uvIndices but mapped correctly
            // to the reversed vertex order. This may involve reversing the order of uvIndices
            // or selecting them based on the new vertex order.
            let uvIdx = uvIndices[face.indices.length - 1 - idx]; // Correctly select the UV index based on reversed order
            return `${fi + vertexOffset + 1}/${uvIdx}/${invertedNormalIndex}`;
          })
          .reverse()
          .join(" ");
        f.push(`f ${invertedFaceDef}`);
      }
    }

    vertexOffset += mesh.vertices.length;
  }

  output += v.join("\n") + "\n\n";
  output += vt.join("\n") + "\n\n";
  output += vn.join("\n") + "\n\n";
  output += f.join("\n") + "\n";

  return output;
}
