# picocadet

An interactive CLI toolkit for [picoCAD][picocad] that can update picoCAD .txt models.

Also can be used as a library for parsing picoCAD models and doing operations on them.

## Install

Use it for its interactive CLI:

```sh
npm install --global picocadet
```

Use it as a Typescript library:

```typescript
import { Model } from 'picocadet'

const text = readFileSync('picocad-data.txt', 'utf8')
const model = Model.parse(text)
console.log(model)
```

## Features

-   [x] Rename meshes: picoCAD meshes have default names based on the primitive shape they started with like "cube" and "pyramid". This action lets you rename them into better names like "head" and "body" to help disambiguate between them.
-   [x] Merge meshes: Combine meshes into one mesh so that they can all be moved and rotated together. This is especially useful when a model is complete so that you can move around groups of meshes into your final scene composition. However, note that meshes can't be unmerged.
-   [x] Save new model.txt files: By default, picocadet saves into new files like model_picocade_3.txt so that your original model.txt remains untouched. During the save process, you can overwrite model.txt instead if you'd like.
-   [x] Import meshes from another file: This lets you reuse meshes or build meshes separately and compose them together.
    -   Optionally import only some of the meshes.
    -   Optionally merge the imported meshes as they're imported.
-   [x] Add other primitive shapes to your model, thanks to speakthesky's custom shape pack. https://speakthesky.itch.io/custom-picocad-shape-pack. (todo: not fully implemented)
-   [x] Export .obj with extra features: You can opt-in to duplicating and inverting the normal of doubled faces so that, when importing your model into other software, your doubled faces have normals on both sides. picoCAD doesn't do this itself (doubling a face doesn't change picoCAD's exported .obj).
-   [x] Copy a face's texture coords (UV) to other faces on the mesh: For example, you set the UV of a cube's face in picoCAD and then tell picocadet to copy that face's UV to the other five sides of the cube to save your the work.
-   [ ] Export to .fbx.

## Tips

-   Rename meshes with useful names to keep track of which mesh is which.
-   Getting into a habit of giving meshes and faces colors as you build makes it easy to find meshes in picocadet.
-   By default, picocadet always saves in a unique filename (`{yourFilename}_picocadet_{number}.txt`). If use picocadet's default filename, you will never lose data. You can always delete excess files when you're done with your model.
-   It's hard to model multiple meshes inside picoCAD since they overlap. Instead, model them separately and use picocadet to merge them into a new file.

## Credits

-   PicoCAD file parsing: https://github.com/lucatronica/picocad-web-viewer
-   Some math and logic: https://github.com/jordanfb/PicoCADToolKit

### TODO

-   [ ] Use plain ol' javascript objects. Lib functions always return new object. Should be trivial to se/derialize from json.
-   [ ] When copying face UVs, let user pick destination faces in a checklist. the readme tip might be to color the faces you want to copy and copyto. note: remember to sort the destination faces by f.indices.length===src.indices.length.

[picocad]: https://johanpeitz.itch.io/picocad
