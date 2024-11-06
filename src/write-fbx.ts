import fs from "fs";
import type { Model } from "./index.js";

export function writeFbx(model: Model, outpath: string) {
  const lines: string[] = [];

  let idCounter = 1;
  function generateId(): number {
    return idCounter++;
  }

  const objectLines: string[] = [];
  const connectionLines: string[] = [];

  // Root node
  objectLines.push('Model: 0, "Model::RootNode", "Null" {');
  objectLines.push("}");

  for (const mesh of model.meshes) {
    const geometryId = generateId();
    const modelId = generateId();

    // Collect vertices
    const vertexArray: number[] = [];
    for (const vertex of mesh.vertices) {
      vertexArray.push(vertex.x, vertex.y, vertex.z);
    }

    // Collect indices
    const indexArray: number[] = [];
    for (const face of mesh.faces) {
      const indices = face.indices;
      for (let i = 0; i < indices.length; i++) {
        let index = indices[i];
        if (i === indices.length - 1) {
          // Last index in the face
          indexArray.push(-(index + 1));
        } else {
          indexArray.push(index);
        }
      }
    }

    // Write Geometry definition
    objectLines.push(
      `Geometry: ${geometryId}, "Geometry::${mesh.name}", "Mesh" {`
    );
    objectLines.push(`\tVertices: *${vertexArray.length} {`);
    objectLines.push(`\t\ta: ${vertexArray.join(",")}`);
    objectLines.push(`\t}`);

    objectLines.push(`\tPolygonVertexIndex: *${indexArray.length} {`);
    objectLines.push(`\t\ta: ${indexArray.join(",")}`);
    objectLines.push(`\t}`);
    objectLines.push("}");

    // Write Model definition
    objectLines.push(`Model: ${modelId}, "Model::${mesh.name}", "Mesh" {`);
    objectLines.push(`\tVersion: 232`);
    objectLines.push(`\tProperties70:  {`);
    objectLines.push(
      `\t\tP: "Lcl Translation", "Lcl Translation", "", "A", ${mesh.pos.x}, ${mesh.pos.y}, ${mesh.pos.z}`
    );
    objectLines.push(
      `\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A", ${mesh.rot.x}, ${mesh.rot.y}, ${mesh.rot.z}`
    );
    objectLines.push(`\t}`);
    objectLines.push("}");

    // Add connections
    connectionLines.push(`\tConnect: "OO", ${geometryId}, ${modelId}`);
    connectionLines.push(`\tConnect: "OO", ${modelId}, 0`);
  }

  lines.push("; FBX 7.1.0 project file");
  lines.push("FBXHeaderExtension: {");
  lines.push("\tFBXHeaderVersion: 1003");
  lines.push("\tFBXVersion: 7100");
  lines.push('\tCreator: "Custom FBX Exporter"');
  lines.push("}");
  lines.push("");
  lines.push("Definitions: {");
  lines.push("\tVersion: 100");
  lines.push(`\tCount: ${model.meshes.length + 1}`);
  lines.push('\tObjectType: "Model" {');
  lines.push(`\t\tCount: ${model.meshes.length + 1}`);
  lines.push("\t}");
  lines.push('\tObjectType: "Geometry" {');
  lines.push(`\t\tCount: ${model.meshes.length}`);
  lines.push("\t}");
  lines.push("}");
  lines.push("");
  lines.push("Objects: {");
  lines.push(...objectLines);
  lines.push("}");
  lines.push("");
  lines.push("Connections: {");
  lines.push(...connectionLines);
  lines.push("}");

  const content = lines.join("\n");
  // fs.writeFileSync(outpath, content)
  console.log(content);
}
