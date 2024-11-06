import { parsePicoCADData, type LuaPicoCADModel } from "./parse-lua.js";
import { parseTexture, readLine, splitString } from "./parse-pico.js";

export type Vec3 = { x: number; y: number; z: number };

export type Texture = number[];

export namespace Texture {
  export function empty(): Texture {
    return new Array(128 * 120).fill(0);
  }
}

export type Model = {
  meshes: Mesh[];
  name: string;
  backgroundIndex: number;
  alphaIndex: number;
  zoomLevel: number;
  texture: Texture;
};

export type Mesh = {
  name: string;
  pos: Vec3;
  rot: Vec3;
  vertices: Vec3[];
  faces: Face[];
};

export type Face = {
  indices: number[]; // Indices that point to mesh.vertices. Unlike in the lua model.txt, it's 0-indexed
  colorIndex: number;
  uvs: [number, number][];
  shading: boolean; // true
  texture: boolean; // true
  doubleSided: boolean; // false
  renderFirst: boolean; // false
};

type NewModel = Omit<
  Model,
  "backgroundIndex" | "alphaIndex" | "zoomLevel" | "texture"
> &
  Partial<
    Pick<Model, "backgroundIndex" | "alphaIndex" | "zoomLevel" | "texture">
  >;

const DEFAULT_CLOSENESS_THRESHOLD = 0.0001;

export namespace Model {
  export function empty(name: string): Model {
    name = name.trim();
    if (name.length === 0) {
      throw new Error("name required");
    }
    return create({
      name,
      meshes: [],
      // backgroundIndex: 1,
      // alphaIndex: 0,
      // zoomLevel: 16,
    });
  }

  export function create(props: NewModel): Model {
    const defaultProps = {
      backgroundIndex: 1,
      alphaIndex: 0,
      zoomLevel: 16,
      texture: Texture.empty(),
    };
    const model = {
      ...defaultProps,
      ...props,
    };

    return model as Model;
  }

  export function mergeOverlappingVertices(
    model: Model,
    threshold = DEFAULT_CLOSENESS_THRESHOLD
  ): Model {
    const newMeshes = model.meshes.map((mesh) =>
      Mesh.mergeOverlappingVertices(mesh, threshold)
    );
    return create({ ...model, meshes: newMeshes });
  }

  export function countUnusedVertices(model: Model): number {
    let unusedVertices: Vec3[] = [];

    for (const mesh of model.meshes) {
      const unusedIndices = Mesh.getUnusedIndices(mesh);
      const meshUnusedVertices = [...unusedIndices].map(
        (index) => mesh.vertices[index]
      );
      unusedVertices = unusedVertices.concat(meshUnusedVertices);
    }

    return unusedVertices.length;
  }

  export function withoutUnusedVertices(model: Model): Model {
    return create({
      ...model,
      meshes: model.meshes.map(Mesh.withoutUnusedVertices),
    });
  }

  export function findOverlappingVertices(
    model: Model,
    threshold = 0.0001
  ): Vec3[][] {
    let overlappingVertices: [Vec3, Vec3][] = [];

    for (const mesh of model.meshes) {
      for (let i = 0; i < mesh.vertices.length; i++) {
        for (let j = i + 1; j < mesh.vertices.length; j++) {
          if (Vec3.isClose(mesh.vertices[i], mesh.vertices[j], threshold)) {
            overlappingVertices.push([mesh.vertices[i], mesh.vertices[j]]);
          }
        }
      }
    }

    return overlappingVertices;
  }

  export function parse(input: string): Model {
    if (!input.startsWith("picocad;")) {
      throw Error("Not a picoCAD file.");
    }

    // Read header.
    const [header, body] = readLine(input);

    const headerValues = header.split(";");
    const name = headerValues[1];
    const [zoomLevel, backgroundIndex, alphaIndex] = headerValues
      .slice(2)
      .map((s) => Number(s));

    const [dataStr, texStr] = splitString(body, "%");

    // Read data.
    const luaData = parsePicoCADData(dataStr);
    const meshes = parseMeshes(luaData);

    const texture = parseTexture(readLine(texStr)[1]);

    return Model.create({
      name,
      meshes,
      alphaIndex,
      backgroundIndex,
      zoomLevel,
      texture,
    });
  }
}

type OptionalFaceFields = Partial<
  Pick<Face, "shading" | "texture" | "doubleSided" | "renderFirst">
>;
type NewFace = Omit<Face, keyof OptionalFaceFields> & OptionalFaceFields;

export namespace Face {
  export function create(props: NewFace): Face {
    return {
      ...props,
      shading: props.shading ?? true,
      texture: props.texture ?? true,
      doubleSided: props.doubleSided ?? false,
      renderFirst: props.renderFirst ?? false,
    } as Face;
  }

  export function copy(face: Face): Face {
    return create({
      indices: [...face.indices],
      colorIndex: face.colorIndex,
      uvs: face.uvs.map((uv) => [...uv]),
      shading: face.shading,
      texture: face.texture,
      doubleSided: face.doubleSided,
      renderFirst: face.renderFirst,
    });
  }
}

export namespace Vec3 {
  export function create(x: number, y: number, z: number): Vec3 {
    return { x, y, z } as Vec3;
  }

  export function zero(): Vec3 {
    return Vec3.create(0, 0, 0);
  }

  export function copy({ x, y, z }: Vec3): Vec3 {
    return create(x, y, z);
  }

  export function add(a: Vec3, b: Vec3): Vec3 {
    return create(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  export function divide({ x, y, z }: Vec3, scalar: number): Vec3 {
    return create(x / scalar, y / scalar, z / scalar);
  }

  export function equal(a: Vec3, b: Vec3): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }
  // Function to calculate the Euclidean distance between two vertices
  export function distance(v1: Vec3, v2: Vec3): number {
    return Math.sqrt(
      Math.pow(v1.x - v2.x, 2) +
        Math.pow(v1.y - v2.y, 2) +
        Math.pow(v1.z - v2.z, 2)
    );
  }

  export function matMult({ x, y, z }: Vec3, matrix: number[][]): Vec3 {
    return create(
      x * matrix[0][0] + y * matrix[0][1] + z * matrix[0][2] + matrix[0][3],
      x * matrix[1][0] + y * matrix[1][1] + z * matrix[1][2] + matrix[1][3],
      x * matrix[2][0] + y * matrix[2][1] + z * matrix[2][2] + matrix[2][3]
    );
  }

  export function isClose(a: Vec3, b: Vec3, threshold: number): boolean {
    return (
      Math.abs(a.x - b.x) < threshold &&
      Math.abs(a.y - b.y) < threshold &&
      Math.abs(a.z - b.z) < threshold
    );
  }
}

////////////////////////////////////////////////////////////
// Mesh
////////////////////////////////////////////////////////////

export namespace Mesh {
  export function create(props: Mesh): Mesh {
    return props;
  }

  export function copy(mesh: Mesh): Mesh {
    return create({
      name: mesh.name,
      pos: Vec3.copy(mesh.pos),
      rot: Vec3.copy(mesh.rot),
      vertices: mesh.vertices.map(Vec3.copy),
      faces: mesh.faces.map(Face.copy),
    });
  }

  export function flip(mesh: Mesh, axis: "x" | "y" | "z"): Mesh {
    mesh = Mesh.copy(mesh);
    for (let vertex of mesh.vertices) {
      vertex[axis] = -vertex[axis];
    }
    return mesh;
  }

  // I don't think I need this, but might need that rewinding order
  export function flip2(mesh: Mesh, axis: "x" | "y" | "z"): Mesh {
    // Create a new mesh that is a copy of the original
    let flippedMesh = Mesh.copy(mesh);

    // Invert the specified coordinate for each vertex
    flippedMesh.vertices = flippedMesh.vertices.map((vertex) => {
      return {
        ...vertex,
        [axis]: -vertex[axis],
      };
    });

    // Optionally, you might need to flip the face winding order
    // This is necessary if the rendering engine culls backfaces based on winding.
    flippedMesh.faces = flippedMesh.faces.map((face) => {
      // Flip the winding order by reversing the indices
      let flippedFace = Face.copy(face);
      flippedFace.indices = flippedFace.indices.reverse();
      return flippedFace;
    });

    return flippedMesh;
  }

  export function rotate(
    mesh: Mesh,
    axis: "x" | "y" | "z",
    degrees: number
  ): Mesh {
    const radians = degrees * (Math.PI / 180);
    let rotationMatrix: number[][];

    switch (axis) {
      case "x":
        rotationMatrix = [
          [1, 0, 0],
          [0, Math.cos(radians), -Math.sin(radians)],
          [0, Math.sin(radians), Math.cos(radians)],
        ];
        break;
      case "y":
        rotationMatrix = [
          [Math.cos(radians), 0, Math.sin(radians)],
          [0, 1, 0],
          [-Math.sin(radians), 0, Math.cos(radians)],
        ];
        break;
      case "z":
        rotationMatrix = [
          [Math.cos(radians), -Math.sin(radians), 0],
          [Math.sin(radians), Math.cos(radians), 0],
          [0, 0, 1],
        ];
        break;
    }

    const rotatedMesh = copy(mesh);
    rotatedMesh.vertices = mesh.vertices.map((vertex) =>
      Vec3.matMult(vertex, rotationMatrix)
    );
    return rotatedMesh;
  }

  export function getPositionMatrix(mesh: Mesh): number[][] {
    return [
      [1, 0, 0, mesh.pos.x],
      [0, 1, 0, mesh.pos.y],
      [0, 0, 1, mesh.pos.z],
      [0, 0, 0, 1],
    ];
  }

  export function getInversePositionMatrix(mesh: Mesh): number[][] {
    return [
      [1, 0, 0, -mesh.pos.x],
      [0, 1, 0, -mesh.pos.y],
      [0, 0, 1, -mesh.pos.z],
      [0, 0, 0, 1],
    ];
  }

  export function getUnusedIndices(mesh: Mesh): Set<number> {
    const usedIndices = new Set<number>();
    for (const face of mesh.faces) {
      for (const i of face.indices) {
        usedIndices.add(i);
      }
    }

    const unusedIndices = new Set<number>();
    for (let i = 0; i < mesh.vertices.length; i++) {
      if (!usedIndices.has(i)) {
        unusedIndices.add(i);
      }
    }
    return unusedIndices;
  }

  export function mergeOverlappingVertices(
    mesh: Mesh,
    threshold = DEFAULT_CLOSENESS_THRESHOLD
  ): Mesh {
    let newVertices: Vec3[] = [];
    const vertexMap = new Map<number, number>(); // Map from old index to new index

    mesh.vertices.forEach((vertex, index) => {
      let found = false;
      for (let i = 0; i < newVertices.length; i++) {
        if (Vec3.isClose(vertex, newVertices[i], threshold)) {
          vertexMap.set(index, i);
          found = true;
          break;
        }
      }
      if (!found) {
        vertexMap.set(index, newVertices.length);
        newVertices.push(vertex);
      }
    });

    const newFaces = mesh.faces.map((face) => {
      const newIndices = face.indices.map((index) => vertexMap.get(index)!);
      return Face.create({ ...face, indices: newIndices });
    });

    return create({ ...mesh, vertices: newVertices, faces: newFaces });
  }

  // Returns a new mesh where unused vertices are removed
  // export function withoutUnusedVertices(mesh: Mesh): Mesh {
  //     const unusedIndices = getUnusedIndices(mesh)
  //     return create({
  //         ...mesh,
  //         vertices: mesh.vertices.filter((_, i) => !unusedIndices.has(i)),
  //     })
  // }
  export function withoutUnusedVertices(mesh: Mesh): Mesh {
    const unusedIndicesSet = getUnusedIndices(mesh);

    const newVertices: Vec3[] = [];
    const indexMap = new Map<number, number>();
    mesh.vertices.forEach((vertex, index) => {
      if (!unusedIndicesSet.has(index)) {
        indexMap.set(index, newVertices.length);
        newVertices.push(vertex);
      }
    });

    const newFaces = mesh.faces.map((face) => {
      const newIndices = face.indices.map((index) => indexMap.get(index)!);
      return Face.create({
        ...face,
        indices: newIndices,
      });
    });

    return create({
      ...mesh,
      vertices: newVertices,
      faces: newFaces,
    });
  }

  export function recenter(mesh: Mesh): Mesh {
    const center = avgWorldVertexPosition(mesh);
    const centeredMesh = copy(mesh);
    centeredMesh.pos = center;
    // // Adjust the vertices' positions to maintain their world space positions
    // centeredMesh.vertices = mesh.vertices.map((vertex) =>
    //     Vec3.create(
    //         vertex.x - center.x,
    //         vertex.y - center.y,
    //         vertex.z - center.z,
    //     ),
    // )
    //
    // Adjust each vertex's position relative to the new mesh position
    // This is to ensure their world space positions are unchanged
    // We convert each vertex position to world space, then subtract the new mesh position
    centeredMesh.vertices = mesh.vertices.map((vertex) => {
      const worldSpaceVertex = transformPointToWorldPosition(mesh, vertex);
      return Vec3.create(
        worldSpaceVertex.x - center.x,
        worldSpaceVertex.y - center.y,
        worldSpaceVertex.z - center.z
      );
    });
    return centeredMesh;
  }

  export function avgLocalVertexPosition(mesh: Mesh): Vec3 {
    if (mesh.vertices.length === 0) {
      throw new Error("mesh has no vertices");
    }
    const sum = mesh.vertices.reduce(Vec3.add, Vec3.zero());
    return Vec3.divide(sum, mesh.vertices.length);
    // let avg = Vec3.create(0, 0, 0)
    // for (const v of mesh.vertices) {
    //     avg = Vec3.add(avg, v)
    // }
    // return Vec3.divide(avg, mesh.vertices.length)
  }

  export function avgWorldVertexPosition(mesh: Mesh): Vec3 {
    const local = avgLocalVertexPosition(mesh);
    return transformPointToWorldPosition(mesh, local);
  }

  export function transformPointToWorldPosition(mesh: Mesh, v: Vec3): Vec3 {
    const positionMatrix = getPositionMatrix(mesh);
    return Vec3.matMult(v, positionMatrix);
  }

  export function transformPointToLocalPosition(mesh: Mesh, v: Vec3): Vec3 {
    const positionMatrix = getInversePositionMatrix(mesh);
    return Vec3.matMult(v, positionMatrix);
  }

  export function moveOriginToLocalPosition(mesh: Mesh, localPos: Vec3) {
    // # just convert the local pos to world pos and then move to there
    // world_pos = self.transform_point_to_world_pos(local_pos)
    // self.move_origin_to_world_position(world_pos)
    const worldPos = transformPointToWorldPosition(mesh, localPos);
    moveOriginToWorldPosition(mesh, worldPos);
  }

  //# move the origin to a new world position! That means you need to calculate all the vertices in worldspace,
  // / /# move the pos, then inverse the positions and store those!
  export function moveOriginToWorldPosition(mesh: Mesh, worldPos: Vec3) {
    const meshPositionMatrix = getPositionMatrix(mesh);
    const worldPosVertices: Vec3[] = [];
    for (const v of mesh.vertices) {
      const transformed = Vec3.matMult(v, meshPositionMatrix);
      worldPosVertices.push(transformed);
    }
    mesh.pos = worldPos;
    const newInverseMatrix = getInversePositionMatrix(mesh);
    const newLocalVertices: Vec3[] = [];
    for (const v of worldPosVertices) {
      const transformed = Vec3.matMult(v, newInverseMatrix);
      newLocalVertices.push(transformed);
    }
    mesh.vertices = newLocalVertices;
  }

  // Immutable
  export function merge({ into, from }: { into: Mesh; from: Mesh }): Mesh {
    into = Mesh.copy(into);
    const vertexOffset = into.vertices.length;
    const intoInversePosMat = getInversePositionMatrix(into);
    const fromPosMat = getPositionMatrix(from);

    for (let v of from.vertices) {
      let transformed = Vec3.matMult(
        Vec3.matMult(v, fromPosMat),
        intoInversePosMat
      );
      into.vertices.push(transformed);
    }

    for (let f of from.faces) {
      let newFace = Face.copy(f);
      newFace.indices = f.indices.map((x) => x + vertexOffset);
      into.faces.push(newFace);
    }

    return into;
  }

  // Finds submeshes that are disconnected from each other
  // TODO https://github.com/jordanfb/PicoCADToolKit/blob/232f9987beaf5773559a4dd43e9c89555ef79c09/picoCADParser.py#L908
  // export function separateMeshes(mesh: Mesh): Mesh[] {
  //     const vertexToMesh = new Map<number, Mesh>()
  //     for (const f of mesh.faces) {
  //         const meshesFaceIsPartOf: Mesh[] = []
  //         for (const vi of f.indices) {
  //             if (vertexToMesh.has(vi)) {
  //                 meshesFaceIsPartOf.push(vertexToMesh.get(vi)!)
  //             }
  //         }

  //         // We have all the meshes that this face is a part of, so combine them into a single mesh
  //         if (meshesFaceIsPartOf.length === 0) {
  //             // Then we have to make a new mesh

  //         }
  //     }
  // }
}

function parseMeshes(lua: LuaPicoCADModel): Mesh[] {
  return lua.array.map((luaObject) => {
    luaObject.dict.pos.array;
    const name = luaObject.dict.name;
    const pos = Vec3.create(
      luaObject.dict.pos.array[0],
      luaObject.dict.pos.array[1],
      luaObject.dict.pos.array[2]
    );
    const rot = Vec3.create(
      luaObject.dict.rot.array[0],
      luaObject.dict.rot.array[1],
      luaObject.dict.rot.array[2]
    );

    const vertices = luaObject.dict.v.array.map((la) =>
      Vec3.create(la.array[0], la.array[1], la.array[2])
    );

    const faces = luaObject.dict.f.array.map((luaFace) => {
      const indices = luaFace.array.map((x) => x - 1);
      const colorIndex = luaFace.dict.c;

      const flatUVs = luaFace.dict.uv.array;
      const uvs: [number, number][] = [];
      for (let i = 1; i < flatUVs.length; i += 2) {
        uvs.push([flatUVs[i - 1], flatUVs[i]]);
      }

      return Face.create({
        indices,
        colorIndex,
        uvs,
        shading: luaFace.dict.noshade !== 1,
        texture: luaFace.dict.notex !== 1,
        doubleSided: luaFace.dict.dbl === 1,
        renderFirst: luaFace.dict.prio === 1,
      });
    });

    return Mesh.create({
      name,
      pos,
      rot,
      vertices,
      faces,
    });
  });
}

const COLOR_NAME = [
  "black",
  "dark blue",
  "dark purple",
  "dark green",
  "brown",
  "dark grey",
  "light grey",
  "white",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "lavender",
  "pink",
  "light peach",
];

const COLOR_HEX = [
  "#000000", // black
  "#1D2B53", // dark blue
  "#7E2553", // dark purple
  "#008751", // dark green
  "#AB5236", // brown
  "#5F574F", // dark grey
  "#C2C3C7", // light grey
  "#FFF1E8", // white
  "#FF004D", // red
  "#FFA300", // orange
  "#FFEC27", // yellow
  "#00E436", // green
  "#29ADFF", // blue
  "#83769C", // lavender
  "#FF77A8", // pink
  "#FFCCAA", // light peach
];

const COLOR_RGB: [number, number, number][] = [
  [0, 0, 0],
  [29, 43, 83],
  [126, 37, 83],
  [0, 135, 81],
  [171, 82, 54],
  [95, 87, 79],
  [194, 195, 199],
  [255, 241, 232],
  [255, 0, 77],
  [255, 163, 0],
  [255, 236, 39],
  [0, 228, 54],
  [41, 173, 255],
  [131, 118, 156],
  [255, 119, 168],
  [255, 204, 170],
];

export namespace Color {
  export function name(color: number): string {
    return COLOR_NAME[color];
  }

  export function hex(color: number): string {
    return COLOR_HEX[color];
  }
  export function rgb(color: number): [number, number, number] {
    return COLOR_RGB[color];
  }
}
