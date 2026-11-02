
import * as THREE from "three";

import {
  OFFICE_LAYOUT,
  type OfficeLayout,
} from "../config/office-layout";

export interface OfficeObjectsController {
  group: THREE.Group;
  dispose: () => void;
}

export function createOfficeObjects(
  scene: THREE.Scene,
  layout: OfficeLayout = OFFICE_LAYOUT,
): OfficeObjectsController {
  const group = new THREE.Group();
  group.name = "office-environment";
  scene.add(group);

  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries = new Map<string, THREE.BufferGeometry>();

  function mat(
    color: string,
    roughness = 0.82,
    metalness = 0,
  ): THREE.MeshStandardMaterial {
    const key = `${color}:${roughness}:${metalness}`;
    const existing = materials.get(key);
    if (existing) return existing;

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    materials.set(key, material);
    return material;
  }

  function geometry(
    key: string,
    create: () => THREE.BufferGeometry,
  ): THREE.BufferGeometry {
    const existing = geometries.get(key);
    if (existing) return existing;

    const result = create();
    geometries.set(key, result);
    return result;
  }

  function mesh(
    shape: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const object = new THREE.Mesh(shape, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Group = group,
  ): THREE.Mesh {
    const key = `box:${width}:${height}:${depth}`;
    return mesh(
      geometry(key, () => new THREE.BoxGeometry(width, height, depth)),
      material,
      parent,
      x,
      y,
      z,
    );
  }

  function cylinder(
    top: number,
    bottom: number,
    height: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Group = group,
    segments = 12,
  ): THREE.Mesh {
    const key = `cylinder:${top}:${bottom}:${height}:${segments}`;
    return mesh(
      geometry(
        key,
        () =>
          new THREE.CylinderGeometry(
            top,
            bottom,
            height,
            segments,
          ),
      ),
      material,
      parent,
      x,
      y,
      z,
    );
  }

  function sphere(
    radius: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Group = group,
  ): THREE.Mesh {
    return mesh(
      geometry(
        `sphere:${radius}`,
        () => new THREE.IcosahedronGeometry(radius, 1),
      ),
      material,
      parent,
      x,
      y,
      z,
    );
  }

  // Soft Studio palette.
  const wood = mat("#c79b75");
  const woodLight = mat("#e4bea0");
  const woodDark = mat("#9e765d");
  const floor = mat("#e9dcca");
  const wall = mat("#f5f0e8");
  const trim = mat("#e1d6c8");
  const metal = mat("#8c969e", 0.5, 0.25);
  const charcoal = mat("#38434b", 0.55);
  const screen = mat("#273f50", 0.4);
  const display = mat("#8bc6d4", 0.48);
  const white = mat("#faf7f1");
  const fabric = mat("#8ca6a7");
  const fabricDark = mat("#6f8c90");
  const fabricLight = mat("#afc2bc");
  const green = mat("#83a68b");
  const greenDark = mat("#5f896f");
  const pot = mat("#c9957c");
  const glass = mat("#b7d6dc", 0.3, 0.05);
  const brass = mat("#c6a77b", 0.48, 0.25);

  // Foundation.
  box(layout.width + 0.35, 0.4, layout.depth + 0.35, 0, -0.36, 0, woodDark);
  box(layout.width, 0.12, layout.depth, 0, -0.1, 0, floor);

  // Subtle wooden floor seams.
  const plankCount = 16;
  for (let i = 1; i < plankCount; i++) {
    const z = -layout.depth / 2 + (layout.depth * i) / plankCount;
    box(layout.width - 0.2, 0.004, 0.014, 0, -0.036, z, woodLight);
  }

  // Back and left walls. Preserve their original footprint.
  box(
    layout.width,
    layout.wallHeight,
    0.3,
    0,
    1.7,
    -layout.depth / 2,
    wall,
  );
  box(
    0.3,
    layout.wallHeight,
    layout.depth,
    -layout.width / 2,
    1.7,
    0,
    wall,
  );

  // Wall skirting and upper trim.
  box(layout.width, 0.15, 0.13, 0, 0.07, -layout.depth / 2 + 0.2, trim);
  box(0.13, 0.15, layout.depth, -layout.width / 2 + 0.2, 0.07, 0, trim);
  box(
    layout.width,
    0.09,
    0.34,
    0,
    1.7 + layout.wallHeight / 2,
    -layout.depth / 2,
    woodLight,
  );

  // Windows on the back wall.
  const backWallFront = -layout.depth / 2 + 0.19;
  for (const x of [-5.1, 0, 5.1]) {
    box(3.25, 1.7, 0.065, x, 2.25, backWallFront, woodDark);
    box(3.05, 1.5, 0.072, x, 2.25, backWallFront + 0.04, glass);
    box(0.065, 1.52, 0.085, x, 2.25, backWallFront + 0.09, white);
    box(3.08, 0.065, 0.085, x, 2.25, backWallFront + 0.09, white);
    box(3.45, 0.12, 0.3, x, 1.36, backWallFront + 0.12, woodLight);
  }

  // Zones: use existing data, no change to office-layout.ts.
  for (const zone of layout.zones) {
    const [x, z] = zone.position;
    const [width, depth] = zone.size;

    const rug = box(
      width,
      0.024,
      depth,
      x,
      -0.025,
      z,
      mat(zone.color, 0.95),
    );

    rug.name = zone.id;
    rug.userData = {
      type: "zone",
      zoneId: zone.id,
      zoneName: zone.name,
    };

    // A restrained border makes the area feel intentional.
    const border = mat("#ffffff", 0.95);
    const y = -0.009;
    box(width, 0.008, 0.035, x, y, z - depth / 2, border);
    box(width, 0.008, 0.035, x, y, z + depth / 2, border);
    box(0.035, 0.008, depth, x - width / 2, y, z, border);
    box(0.035, 0.008, depth, x + width / 2, y, z, border);
  }

  function createChair(
    parent: THREE.Group,
    x: number,
    z: number,
    facing = 1,
  ): void {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = facing < 0 ? Math.PI : 0;
    parent.add(chair);

    // Seat cushion and backrest.
    box(0.68, 0.14, 0.56, 0, 0.53, 0, fabricLight, chair);
    box(0.66, 0.68, 0.14, 0, 0.93, 0.24, fabric, chair);
    box(0.57, 0.42, 0.025, 0, 0.95, 0.16, fabricLight, chair);

    // Chair stem and feet.
    cylinder(0.055, 0.055, 0.36, 0, 0.3, 0, metal, chair);
    cylinder(0.13, 0.13, 0.045, 0, 0.12, 0, charcoal, chair);

    for (const dx of [-0.24, 0.24]) {
      box(0.09, 0.07, 0.59, dx, 0.12, 0, charcoal, chair);
      box(0.07, 0.31, 0.07, dx, 0.7, 0, metal, chair);
      box(0.15, 0.055, 0.33, dx, 0.85, -0.04, fabric, chair);
    }
  }

  // Workstations. Group structure and desk IDs are critical for raycasting.
  for (const desk of layout.desks) {
    const [x, z] = desk.position;

    const station = new THREE.Group();
    station.name = desk.id;
    station.position.set(x, 0, z);
    station.userData = {
      type: "desk",
      deskId: desk.id,
    };
    group.add(station);

    // Layered desktop.
    box(1.84, 0.12, 0.98, 0, 0.95, 0, wood, station);
    box(1.76, 0.035, 0.91, 0, 1.03, 0, woodLight, station);
    box(1.78, 0.045, 0.07, 0, 0.86, 0.43, woodDark, station);

    // Legs and modesty panel.
    for (const dx of [-0.73, 0.73]) {
      for (const dz of [-0.34, 0.34]) {
        box(0.075, 0.86, 0.075, dx, 0.45, dz, metal, station);
      }
    }
    box(1.4, 0.3, 0.045, 0, 0.63, -0.36, woodDark, station);

    // Monitor and stand.
    box(0.86, 0.57, 0.075, 0, 1.38, -0.23, charcoal, station);
    box(0.75, 0.46, 0.012, 0, 1.39, -0.183, screen, station);
    box(0.13, 0.33, 0.014, -0.27, 1.39, -0.173, display, station);
    box(0.36, 0.055, 0.014, 0.1, 1.52, -0.172, white, station);
    box(0.36, 0.13, 0.014, 0.1, 1.36, -0.172, display, station);
    box(0.065, 0.24, 0.065, 0, 1.09, -0.23, metal, station);
    box(0.33, 0.025, 0.22, 0, 1.055, -0.23, metal, station);

    // Keyboard, mouse and desk mat.
    box(0.94, 0.012, 0.34, 0.1, 1.054, 0.22, fabricDark, station);
    box(0.59, 0.03, 0.18, 0, 1.074, 0.19, charcoal, station);
    box(0.11, 0.035, 0.17, 0.51, 1.077, 0.19, white, station);

    // Desk lamp.
    cylinder(0.13, 0.13, 0.04, -0.7, 1.08, -0.23, metal, station);
    cylinder(0.025, 0.025, 0.37, -0.7, 1.28, -0.23, brass, station);
    const shade = cylinder(
      0.065, 0.2, 0.2,
      -0.7, 1.5, -0.23,
      mat("#f2d5a1"),
      station,
    );
    shade.rotation.z = -0.2;

    // A small book and cup add character without excessive detail.
    box(0.23, 0.055, 0.16, 0.7, 1.08, 0.13, mat("#8eafad"), station);
    cylinder(0.07, 0.06, 0.13, 0.69, 1.12, 0.32, white, station);

    // Preserve original chair placement for the existing Agent model.
    createChair(station, 0, 1.05);
  }

  // Meeting area.
  const meeting = new THREE.Group();
  meeting.name = "meeting-room";
  meeting.userData = {
    type: "room",
    roomId: "meeting-room",
  };
  group.add(meeting);

  const [mx, mz] = layout.meetingRoom.position;

  box(3.55, 0.15, 1.72, mx, 0.86, mz, wood, meeting);
  box(3.43, 0.035, 1.61, mx, 0.953, mz, woodLight, meeting);
  box(0.4, 0.78, 0.43, mx, 0.43, mz, metal, meeting);

  // Decorative table runner.
  box(1.35, 0.008, 0.35, mx, 0.975, mz, fabricLight, meeting);

  for (const x of layout.meetingRoom.chairsX) {
    for (const z of layout.meetingRoom.chairsZ) {
      createChair(meeting, x, z, z < mz ? -1 : 1);
    }
  }

  // Meeting display, positioned relative to the back wall.
  const meetingScreenX = 5.1;
  const meetingScreenZ = backWallFront + 0.2;
  box(1.35, 0.81, 0.09, meetingScreenX, 2.15, meetingScreenZ, charcoal, meeting);
  box(1.2, 0.65, 0.012, meetingScreenX, 2.15, meetingScreenZ + 0.054, display, meeting);

  // Lounge.
  const [lx, lz] = layout.lounge.position;

  box(3.2, 0.5, 1.06, lx, 0.36, lz, fabric);
  box(3.2, 0.8, 0.27, lx, 0.82, lz + 0.47, fabricDark);

  for (const dx of [-1.1, 0, 1.1]) {
    box(0.98, 0.11, 0.78, lx + dx, 0.67, lz - 0.06, fabricLight);
  }

  for (const dx of [-1.53, 1.53]) {
    box(0.18, 0.56, 1.02, lx + dx, 0.5, lz, fabricDark);
  }

  box(1.75, 0.12, 0.95, lx, 0.49, lz - 1.8, woodLight);
  for (const dx of [-0.62, 0.62]) {
    box(0.09, 0.42, 0.09, lx + dx, 0.24, lz - 1.8, metal);
  }
  cylinder(0.17, 0.17, 0.06, lx, 0.58, lz - 1.8, pot);
  sphere(0.2, lx, 0.78, lz - 1.8, green);

  // Reception.
  const [rx, rz] = layout.reception.position;

  box(3.4, 1.02, 0.75, rx, 0.52, rz, woodDark);
  box(3.6, 0.13, 0.92, rx, 1.08, rz, woodLight);
  box(2.1, 0.1, 0.045, rx, 0.67, rz + 0.39, brass);
  box(0.8, 0.53, 0.08, rx, 1.49, rz - 0.13, charcoal);
  box(0.68, 0.41, 0.014, rx, 1.49, rz - 0.078, display);

  // Wall art on the left wall.
  const leftWallFront = -layout.width / 2 + 0.22;
  for (const z of [-3.5, 0.5, 4.2]) {
    box(0.09, 1.45, 1.16, leftWallFront, 2.18, z, woodDark);
    box(
      0.1, 1.29, 1.0,
      leftWallFront + 0.06, 2.18, z,
      mat(z < 0 ? "#b6cfc0" : "#dfc3af"),
    );
  }

  // Low-poly plants.
  for (const [x, z] of layout.plants) {
    cylinder(0.32, 0.25, 0.55, x, 0.28, z, pot);
    cylinder(0.075, 0.09, 0.72, x, 0.86, z, woodDark);
    sphere(0.53, x, 1.23, z, green);
    sphere(0.37, x - 0.28, 0.99, z + 0.12, greenDark);
    sphere(0.36, x + 0.28, 1.05, z - 0.1, green);
  }

  let disposed = false;

  return {
    group,

    dispose() {
      if (disposed) return;
      disposed = true;

      group.removeFromParent();
      group.clear();

      for (const item of geometries.values()) {
        item.dispose();
      }

      for (const material of materials.values()) {
        material.dispose();
      }

      geometries.clear();
      materials.clear();
    },
  };
}
