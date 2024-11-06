import { Face, Mesh, Vec3 } from "./index.js";

export const tetrahedronOffGrid = Mesh.create({
  name: "tetrahedron",
  pos: Vec3.create(0, 0, 0),
  rot: Vec3.create(0, 0, 0),
  vertices: [
    Vec3.create(0.943, 0.5, 0),
    Vec3.create(-0.471, 0.5, 0.816),
    Vec3.create(-0.471, 0.5, -0.816),
    Vec3.create(0, -0.8329, 0),
  ],
  faces: [
    Face.create({
      indices: [2, 0, 1],
      colorIndex: 11,
      uvs: [
        [3, 0],
        [2, 1.25],
        [1, 0],
      ],
    }),
    Face.create({
      indices: [3, 1, 0],
      colorIndex: 11,
      uvs: [
        [8, 1.25],
        [9, 0],
        [7, 0],
      ],
    }),
    Face.create({
      indices: [3, 0, 2],
      colorIndex: 11,
      uvs: [
        [6, 1.25],
        [5, 0],
        [7, 0],
      ],
    }),
    Face.create({
      indices: [1, 3, 2],
      colorIndex: 11,
      uvs: [
        [5, 0],
        [4, 1.25],
        [3, 0],
      ],
    }),
  ],
});

export const tetrahedronOnGrid = Mesh.create({
  name: "tetrahedron",
  pos: Vec3.create(0, 0, 0),
  rot: Vec3.create(0, 0, 0),
  vertices: [
    Vec3.create(1, 0.5, 0),
    Vec3.create(-0.5, 0.5, 0.75),
    Vec3.create(-0.5, 0.5, -0.75),
    Vec3.create(0, -0.75, 0),
  ],
  faces: [
    Face.create({
      indices: [2, 0, 1],
      colorIndex: 11,
      uvs: [
        [3, 0],
        [2, 1.25],
        [1, 0],
      ],
    }),
    Face.create({
      indices: [3, 1, 0],
      colorIndex: 11,
      uvs: [
        [8, 1.25],
        [9, 0],
        [7, 0],
      ],
    }),
    Face.create({
      indices: [3, 0, 2],
      colorIndex: 11,
      uvs: [
        [6, 1.25],
        [5, 0],
        [7, 0],
      ],
    }),
    Face.create({
      indices: [1, 3, 2],
      colorIndex: 11,
      uvs: [
        [5, 0],
        [4, 1.25],
        [3, 0],
      ],
    }),
  ],
});

export const shapes: { name: string; mesh: Mesh }[] = [
  { name: "Tetrahedron (on grid)", mesh: tetrahedronOnGrid },
  {
    name: "Tetrahedron (off grid)",
    mesh: tetrahedronOffGrid,
  },
];
