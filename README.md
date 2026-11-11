# Procedural Three.js Object Studies

Five editable 3D models built from reference photographs: a box grater, wooden table, tomato, netted lifebuoy, and blue glitter can. The main viewers show the original image next to the model and support orbiting, zooming, and inspecting parts.

## Run locally

Use Node.js 22 and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open a viewer route below at `http://127.0.0.1:5173`. If Vite picks a different port, use the address printed in the terminal. Stop the server with `Ctrl+C`.

| Model | Reference viewer | TypeScript factory | Standalone JavaScript variant |
| --- | --- | --- | --- |
| Box grater | [`/`](./index.html) | [createGraterModel.ts](./src/createGraterModel.ts) | [`/grater-direct.html`](./grater-direct.html) · [source](./src/box-grater.js) |
| Wooden table | [`/table.html`](./table.html) | [createWoodenTableModel.ts](./src/createWoodenTableModel.ts) | [`/wooden-table-direct.html`](./wooden-table-direct.html) · [source](./src/wooden-table.js) |
| Tomato | [`/tomato.html`](./tomato.html) | [createTomatoModel.ts](./src/createTomatoModel.ts) | [`/tomato-direct.html`](./tomato-direct.html) · [source](./src/tomato.js) |
| Netted lifebuoy | [`/lifebuoy.html`](./lifebuoy.html) | [createLifebuoyModel.ts](./src/createLifebuoyModel.ts) | — |
| Blue glitter can | [`/blue-can.html`](./blue-can.html) | [createBlueCanModel.ts](./src/createBlueCanModel.ts) | — |

The direct pages are alternate models with simpler viewers. They also run through Vite. The main grater, table, and tomato viewers have a **Download GLB** button.

## Build and reuse

```sh
npm run build
```

This checks TypeScript and builds all eight viewer pages into `dist/`. Serve that directory with a static HTTP server at the site root. To reuse a model in another Three.js scene, import its factory and add the returned `Group` to your scene. For example, from a module in `src/`:

```ts
import { createLifebuoyModel } from './createLifebuoyModel';

scene.add(createLifebuoyModel());
```

The viewers use the reference images in [`public/`](./public). Keep those files and the grater's texture assets in [`public/evidence/`](./public/evidence) when distributing the project. The root `evidence/` directory, skill state, and local preview and check output are generated during reconstruction and are excluded from Git. The app builds without them or the img2threejs skill installed.

The models are approximate single-image reconstructions. Hidden details are inferred, and the can's lettering is a redrawn approximation.
