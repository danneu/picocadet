import { version } from "../package.json";
import { constants, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile, access } from "node:fs/promises";
import { Mesh, Model, Color, Vec3 } from "./index.js";
import writePicoCADFile from "./write-picocad-file.js";
import { join, basename, dirname, extname } from "path";
import writeObj, { type ExportObjOptions } from "./write-obj.js";
import { isAbsolute, resolve } from "node:path";
import chalk from "chalk";
const { prompt, Separator } = require("inquirer");
import { shapes } from "./shapes.js";

async function main() {
  // let filePath = process.argv[process.argv.length - 1]
  let filePath = process.argv[2];
  if (!filePath) {
    console.error("must provide a file path. usage: picocadet model.txt");
    process.exit(1);
  }
  if (extname(filePath) !== ".txt") {
    console.error("must be a .txt file");
    process.exit(1);
  }
  if (!isAbsolute(filePath)) {
    filePath = join(process.cwd(), filePath);
  }
  if (!(await fileExists(filePath))) {
    console.error("file not found");
    process.exit(1);
  }

  const data = await readFile(filePath, "utf8");
  let model = Model.parse(data);
  // console.log(inspect(model, { depth: null }))

  console.log(`\n${chalk.bold("picocadet")} ${version} by @danneu`);
  console.log(`${chalk.gray("https://github.com/danneu/picocadet")}\n`);

  console.log(`${basename(filePath)} loaded`);

  while (true) {
    printModelInfo(model);
    console.log();
    const { action } = await prompt({
      type: "list",
      loop: false,
      name: "action",
      message: "What do you want to do?",
      choices: [
        { name: "Add shape", value: "shape" },
        { name: "Rename a mesh", value: "rename" },
        { name: "Recenter mesh", value: "recenter" },
        { name: "Merge meshes", value: "merge" },
        { name: "Flip mesh", value: "flip" },
        { name: "Change all mesh face props", value: "all-face-props" },
        { name: "Round vertices", value: "round-vertices" },
        { name: "Copy UVs", value: "copy-uvs" },
        { name: "Import meshes", value: "import" },
        {
          name: "Merge overlapping vertices",
          value: "merge-overlapping-vertices",
        },
        {
          name: "Delete unused vertices",
          value: "delete-unused-vertices",
        },
        { name: "Save as...", value: "save" },
        { name: "Overwrite", value: "overwrite" },
        { name: "Export .obj", value: "export" },
        new Separator(),
        { name: "Exit", value: "exit" },
      ],
    });
    switch (action) {
      case "recenter": {
        const { index } = await prompt({
          type: "list",
          name: "index",
          message: "Choose a mesh",
          choices: model.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
        });
        const mesh = model.meshes[index];
        model.meshes[index] = Mesh.recenter(mesh);
        break;
      }
      // TODO: Choose which faces to copy into
      case "copy-uvs": {
        const { index } = await prompt({
          type: "list",
          name: "index",
          message: "Choose a mesh",
          choices: model.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
        });
        const mesh = model.meshes[index];

        const { faceIndex } = await prompt({
          type: "list",
          name: "faceIndex",
          message: "Choose a face with UVs to be copied",
          choices: mesh.faces.map((f, i) => ({
            name: `Face ${showColor(f.colorIndex)} [${f.uvs.join(",")}]`,
            value: i,
          })),
        });

        const sourceFace = mesh.faces[faceIndex];

        const destinationChoices = mesh.faces.flatMap((f, i) => {
          // Skip self
          if (i === faceIndex) return [];
          // Only consider faces with same vertex count
          if (f.indices.length !== sourceFace.indices.length) return [];
          return [
            {
              name: `Face ${showColor(f.colorIndex)} [${f.uvs.join(",")}]`,
              value: i,
            },
          ];
        });

        if (destinationChoices.length === 0) {
          console.log("There are no other faces with the same vertex count");
          break;
        }

        const { destinationIndices } = await prompt({
          type: "checkbox",
          name: "destinationIndices",
          message: "Choose which faces should receive this UV",
          choices: destinationChoices,
        });

        for (let i = 0; i < mesh.faces.length; i++) {
          if (destinationIndices.includes(i)) {
            mesh.faces[i].uvs = sourceFace.uvs.slice(0);
          }
        }

        break;
      }
      case "round-vertices": {
        const { meshIdxs } = await prompt({
          type: "checkbox",
          name: "meshIdxs",
          message: "Choose meshes to round their vertices to nearest decimal.",
          choices: model.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
        });
        let { multiple } = await prompt({
          type: "input",
          name: "multiple",
          message: "Round vertices to nearest multiple.",
          default: "0.25",
          validate: async (s: string) => {
            const re = /^\d+(\.\d+)?$/;
            if (!re.test(s)) return "must be a number";
            return true;
          },
        });
        multiple = parseFloat(multiple);
        console.dir(model.meshes, { depth: null });
        for (const i of meshIdxs) {
          model.meshes[i] = Mesh.roundVertices(model.meshes[i], multiple);
        }
        console.dir(model.meshes, { depth: null });
        break;
      }
      case "all-face-props": {
        const { index } = await prompt({
          type: "list",
          name: "index",
          message: "Choose a mesh",
          choices: model.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
        });

        const mesh = model.meshes[index];

        const { props } = await prompt({
          type: "checkbox",
          name: "props",
          message: "Pick properties for all faces in mesh",
          choices: [
            { name: "doubled", selected: false },
            { name: "shading", selected: true },
            { name: "textured", selected: true },
            { name: "draw behind", selected: false },
          ],
        });

        for (const f of mesh.faces) {
          f.doubleSided = props.includes("doubled");
          f.renderFirst = props.includes("draw behind");
          f.shading = props.includes("shading");
          f.texture = props.includes("textured");
        }

        break;
      }
      case "flip": {
        const { index } = await prompt({
          type: "list",
          name: "index",
          message: "Choose a mesh to flip",
          choices: model.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
        });
        const { axis } = await prompt({
          type: "list",
          name: "axis",
          message: "Choose an axis",
          choices: ["x", "y", "z"],
        });

        let mesh = model.meshes[index];
        model.meshes[index] = Mesh.flip2(mesh, axis);
        break;
      }
      case "shape": {
        const { shape }: { shape: Mesh } = await prompt({
          type: "list",
          name: "shape",
          message: "Choose a shape mesh to add",
          filter: (name: string) =>
            shapes.find((shape) => shape.name === name)!.mesh,
          choices: shapes.map((shape) => shape.name),
        });
        model.meshes.push(shape);
        break;
      }
      case "merge-overlapping-vertices": {
        model = Model.mergeOverlappingVertices(model);
        break;
      }
      case "delete-unused-vertices": {
        model = Model.withoutUnusedVertices(model);
        break;
      }
      case "import": {
        let { filepath } = await prompt({
          type: "input",
          name: "filepath",
          message: `Give me absolute path to other picoCAD file ${chalk.reset(
            `(hint: drag file here)`
          )}\n  Or give me a filename from this directory "${chalk.reset(
            dirname(filePath)
          )}"\n> `,
          filter: (s: string) => {
            // unescape spaces
            s = s.trim().replace(/\\ /g, " ");
            if (!isAbsolute(s)) {
              s = join(dirname(filePath), s);
            }
            return s;
          },
          validate: async (s: string) => {
            if (!s.endsWith(".txt")) return "path should end with .txt";
            if (!(await fileExists(s))) return "file does not exist";
            return true;
          },
        });

        const text = await readFile(filepath, "utf8");
        const otherModel = Model.parse(text);

        const { idxs } = await prompt({
          type: "checkbox",
          name: "idxs",
          message: "Which meshes to import?",
          choices: otherModel.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
          validate: (idxs: number[]) => {
            if (idxs.length === 0) return "must select at least one mesh";
            return true;
          },
        });

        const { options } = await prompt({
          type: "checkbox",
          name: "options",
          messages: "Import options",
          choices: [
            {
              name: "Merge meshes before import",
              value: "merge",
              selected: false,
            },
          ],
        });

        let meshesToMerge = otherModel.meshes.filter((_, i) =>
          idxs.includes(i)
        );

        if (options.includes("merge")) {
          let acc: Mesh = meshesToMerge[0];
          for (const m of meshesToMerge.slice(1)) {
            acc = Mesh.merge({ into: acc, from: m });
          }
          meshesToMerge = [acc];
        }

        model.meshes.push(...meshesToMerge);

        break;
      }
      case "export": {
        const { options } = await prompt({
          type: "checkbox",
          name: "options",
          choices: [
            {
              name: "Duplicate and invert doubled faces",
              value: "dbl",
            },
          ],
        });

        const o: ExportObjOptions = {
          dupeAndInvertDoubledFaces: options.includes("dbl"),
        };

        const text = writeObj(model, o);

        console.log(text);

        const { filename } = await prompt({
          type: "input",
          name: "filename",
          message: "Choose a filename",
          default: model.name + ".obj",
        });
        const objPath = join(process.cwd(), filename);
        writeFileSync(objPath, text);
        console.log(`Wrote file ${objPath}`);

        break;
      }
      case "merge": {
        const { destinationIndex } = await prompt({
          type: "list",
          name: "destinationIndex",
          message: "Choose a destination",
          choices: model.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
        });
        let dst = model.meshes[destinationIndex];
        const { indices } = await prompt({
          type: "checkbox",
          name: "indices",
          message: `Choose meshes to merge into "${dst.name}"`,
          validate: (is: number[]) => {
            if (is.length === 0) return "must select at least one mesh";
            return true;
          },
          choices: model.meshes.flatMap((mesh, i) =>
            i === destinationIndex
              ? []
              : [
                  {
                    name: meshListView(mesh),
                    value: i,
                  },
                ]
          ),
        });
        const srcs = model.meshes.filter((_, i) => indices.includes(i));
        for (const src of srcs) {
          dst = Mesh.merge({ into: dst, from: src });
        }
        model.meshes[destinationIndex] = dst;
        model.meshes = model.meshes.filter((_, i) => !indices.includes(i));
        break;
      }
      case "exit":
        process.exit();
      case "overwrite": {
        const serialized = writePicoCADFile(model);
        await writeFile(filePath, serialized, { encoding: "utf8" });
        console.log(`Wrote file ${filePath}`);
        break;
      }
      case "save":
        // Get filename / save location from user
        const original = basename(filePath);
        const suggested = await generateUniqueFilename(filePath);
        const { filename } = await prompt({
          type: "input",
          name: "filename",
          message: "Choose a filename",
          default: suggested,
          filter: (s: string) => s.trim(),
          validate: (s: string) => {
            if (!s.endsWith(".txt")) return "must end with .txt";
            if (s.length < ".txt".length + 1) return "cannot be empty";
            if (!/^[a-z0-9_\.]+$/i.test(s))
              return "must only contain alphanum characters (a-z0-9), underscore, or period";
            return true;
          },
        });

        const newFilePath = join(dirname(filePath), filename);

        if (await fileExists(newFilePath)) {
          const { confirm } = await prompt({
            type: "confirm",
            name: "confirm",
            message: `Overwrite ${filename}?`,
            default: false,
          });
          if (!confirm) {
            break;
          }
        }

        // Rename the model so that saving it in picocad
        // saves to {name}.txt instead of the old model's file.
        model.name = basename(newFilePath, ".txt");

        const serialized = writePicoCADFile(model);
        // console.log(serialized.replace(/}%[.\s\w]+/, ''))
        await writeFile(newFilePath, serialized, { encoding: "utf8" });
        console.log(`Wrote file ${newFilePath}`);
        break;

      case "rename": {
        // user selects a mesh and we ask them for new name.
        const { index } = await prompt({
          type: "list",
          name: "index",
          message: "Choose a mesh to rename",
          choices: model.meshes.map((mesh, i) => ({
            name: meshListView(mesh),
            value: i,
          })),
        });
        const mesh = model.meshes[index];
        // If empty, use old name
        const { newName } = await prompt({
          type: "input",
          name: "newName",
          message: `Write a new name:`,
          default: mesh.name,
          filter: (s: string) => s.trim(),
        });
        mesh.name = newName || mesh.name;
        model.meshes[index] = mesh;
        break;
      }
    }
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    } else {
      throw e;
    }
  }
  return true;
}

async function generateUniqueFilename(filePath: string): Promise<string> {
  const base = basename(filePath, ".txt");
  const match = base.match(/(.+)_picocadet_(\d+)$/);
  let nonce = 0;
  let name = base;

  // If filename matches the pattern, extract the base name and current nonce
  if (match && match.length === 3) {
    name = match[1];
    nonce = Number.parseInt(match[2], 10) + 1;
  }

  let newFilename: string;

  while (true) {
    newFilename = `${name}_picocadet_${nonce}.txt`;
    const newFilepath = join(dirname(filePath), newFilename);

    if (await fileExists(newFilepath)) {
      nonce++;
      continue;
    } else {
      break;
    }
  }

  return newFilename;
}

function showColor(colorIndex: number): string {
  const block = "█";
  // return chalk.hex(colorIndex === 0 ? '#111111' : Color.hex(colorIndex))(
  //     block
  // )
  const hex = colorIndex === 0 ? "#111111" : Color.hex(colorIndex);
  return chalk.hex(hex)(block);
}

// For use when listing meshes, this displays a mesh's name and
// info about the mesh like the colors of its faces to disambiguate
// which mesh is which.
function meshListView(mesh: Mesh): string {
  const faceColors = mesh.faces.map((f) => showColor(f.colorIndex)).join("");
  return `${mesh.name} ${faceColors}`;
}

function printModelInfo(model: Model) {
  const { fs, vs } = model.meshes.reduce(
    (acc, mesh) => ({
      fs: acc.fs + mesh.faces.length,
      vs: acc.vs + mesh.vertices.length,
    }),
    { fs: 0, vs: 0 }
  );
  const unusedVertices = Model.countUnusedVertices(model);
  const overlappingVertices = Model.findOverlappingVertices(model).length;
  console.log(
    `found ${model.meshes.length} meshes, ${fs} faces, ${vs} vertices (${unusedVertices} unused, ${overlappingVertices} overlapping)`
  );
  for (let i = 0; i < model.meshes.length; i++) {
    const mesh = model.meshes[i];
    console.log(` ${i + 1}. ${meshListView(mesh)}`);
  }
}

main().catch(console.error);

////////////////////////////////////////////////////////////

// Function to calculate and return the distances between every pair of vertices using global positions
export function debug(model: Model) {
  const globalVertices: Vec3[] = [];

  for (const mesh of model.meshes) {
    for (const v of mesh.vertices) {
      const global = Mesh.transformPointToWorldPosition(mesh, v);
      globalVertices.push(global);
    }
  }

  const distances: number[] = [];
  for (const a of globalVertices) {
    for (const b of globalVertices) {
      if (Vec3.equal(a, b)) continue;
      const distance = Vec3.distance(a, b);
      distances.push(distance);
    }
  }

  console.log(Math.min(...distances));
}
