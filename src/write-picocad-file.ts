import { Face, Mesh, Model, Vec3 } from "./index.js";

export default function writePicoCADFile(model: Model): string {
  let s = "";
  s += `picocad;${model.name};${model.zoomLevel};${model.backgroundIndex};${model.alphaIndex}\n`;
  s += "{\n";
  s += model.meshes.map(writeMesh).join(",");
  s += `\n}%\n`;

  // texture
  let line = "";
  for (let i = 0; i < 128 * 120; i++) {
    if (i > 0 && i % 128 === 0) {
      s += line + "\n";
      line = "";
    }
    line += model.texture![i].toString(16);
  }
  s += line + "\n";
  return s;
}

function writeMesh(mesh: Mesh): string {
  let s = "";
  s += "{\n";
  let line = ` name='${mesh.name}', `;
  line += `pos=${vec3ToLuaString(mesh.pos)}, `;
  line += `rot=${vec3ToLuaString(mesh.rot)},`;
  s += line + "\n";

  // v
  s += " v={\n";
  s += mesh.vertices.map((v) => "  " + vec3ToLuaString(v)).join(",\n") + "\n";
  s += " },\n";

  // f
  s += " f={\n";
  s += mesh.faces.map((f) => faceToString(f)).join(",\n") + "\n";
  s += " } \n"; // note: extra space since picoCAD files have it

  s += "}";
  return s;
}

function vec3ToLuaString({ x, y, z }: Vec3): string {
  return `{${x},${y},${z}}`;
}

function faceToString(face: Face): string {
  let s = "  ";
  s += "{" + face.indices.map((n) => n + 1).join(",") + ", ";
  s += `c=${face.colorIndex}, `;
  if (face.doubleSided) s += "dbl=1, ";
  if (!face.shading) s += "noshade=1, ";
  if (!face.texture) s += "notex=1, ";
  if (face.renderFirst) s += "prio=1, ";

  s += `uv={${face.uvs.flatMap(([u, v]) => `${u},${v}`).join(",")}}`;
  s += " }";
  return s;
}
