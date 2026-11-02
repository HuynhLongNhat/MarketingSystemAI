
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

  const materials = new Map<
    string,
    THREE.MeshStandardMaterial
  >();
  const geometries = new Set<THREE.BufferGeometry>();

  function mat(
    color: string,
    roughness = 0.8,
    metalness = 0,
  ) {
    const key = `${color}:${roughness}:${metalness}`;
    const cached = materials.get(key);
    if (cached) return cached;

    const value = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });

    materials.set(key, value);
    return value;
  }

  const wood = mat("#b78357");
  const woodDark = mat("#916344");
  const woodLight = mat("#d7ac7e");
  const wall = mat("#f5f1e9");
  const trim = mat("#e4ded3");
  const floor = mat("#e5d2b7");
  const metal = mat("#718096", 0.45, 0.35);
  const black = mat("#293746", 0.55);
  const screen = mat("#172b3b", 0.35);
  const display = mat("#75c9df", 0.35);
  const fabric = mat("#607d91");
  const fabricDark = mat("#486579");
  const white = mat("#f8fafc");
  const green = mat("#568a67");
  const greenDark = mat("#3c7454");
  const pot = mat("#bd8067");
  const glass = mat("#b9dbe5", 0.2, 0.1);

  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
  ) {
    geometries.add(geometry);

    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    parent: THREE.Group = group,
  ) {
    return mesh(
      new THREE.BoxGeometry(w, h, d),
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
    segments = 10,
  ) {
    return mesh(
      new THREE.CylinderGeometry(
        top,
        bottom,
        height,
        segments,
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
  ) {
    return mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      material,
      parent,
      x,
      y,
      z,
    );
  }

  // Floor
  box(
    layout.width,
    0.45,
    layout.depth,
    0,
    -0.3,
    0,
    floor,
  );

  // Floor planks
  const plankCount = 16;
  const plankDepth = layout.depth / plankCount;

  for (let i = 0; i < plankCount; i++) {
    const z =
      -layout.depth / 2 +
      plankDepth * (i + 0.5);

    box(
      layout.width - 0.15,
      0.008,
      0.018,
      0,
      -0.068,
      z,
      woodLight,
    );
  }

  // Back and left walls
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

  // Wall skirting
  box(
    layout.width,
    0.18,
    0.12,
    0,
    0.08,
    -layout.depth / 2 + 0.2,
    trim,
  );

  box(
    0.12,
    0.18,
    layout.depth,
    -layout.width / 2 + 0.2,
    0.08,
    0,
    trim,
  );

  // Back wall windows
  for (const x of [-5.1, 0, 5.1]) {
    box(
      3.2,
      1.65,
      0.055,
      x,
      2.25,
      -6.79,
      woodDark,
    );

    box(
      3.02,
      1.47,
      0.065,
      x,
      2.25,
      -6.745,
      glass,
    );

    box(
      0.08,
      1.5,
      0.09,
      x,
      2.25,
      -6.69,
      white,
    );

    box(
      3.1,
      0.07,
      0.09,
      x,
      2.25,
      -6.69,
      white,
    );

    box(
      3.4,
      0.11,
      0.3,
      x,
      1.36,
      -6.61,
      woodLight,
    );
  }

  // Area rugs / zones
  for (const zone of layout.zones) {
    const [x, z] = zone.position;
    const [w, d] = zone.size;

    const rug = box(
      w,
      0.035,
      d,
      x,
      -0.047,
      z,
      mat(zone.color),
    );

    rug.name = zone.id;
    rug.userData = {
      type: "zone",
      zoneId: zone.id,
      zoneName: zone.name,
    };
  }

  function createChair(
    parent: THREE.Group,
    x: number,
    z: number,
    facing = 1,
  ) {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = facing < 0 ? Math.PI : 0;
    parent.add(chair);

    box(
      0.62, 0.13, 0.52,
      0, 0.53, 0,
      fabric, chair,
    );

    box(
      0.62, 0.68, 0.13,
      0, 0.91, 0.24,
      fabricDark, chair,
    );

    box(
      0.07, 0.35, 0.07,
      0, 0.29, 0,
      metal, chair,
    );

    for (const dx of [-0.24, 0.24]) {
      box(
        0.08, 0.08, 0.58,
        dx, 0.12, 0,
        black, chair,
      );

      box(
        0.09, 0.32, 0.09,
        dx, 0.69, 0,
        metal, chair,
      );

      box(
        0.12, 0.055, 0.32,
        dx, 0.86, -0.04,
        fabricDark, chair,
      );
    }

    for (const dz of [-0.23, 0.23]) {
      cylinder(
        0.065, 0.065, 0.09,
        0, 0.075, dz,
        black, chair,
      );
    }
  }

  // Workstations
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

    // Desk surface and trim
    box(
      1.75, 0.14, 0.9,
      0, 0.94, 0,
      wood, station,
    );

    box(
      1.7, 0.045, 0.07,
      0, 0.83, 0.4,
      woodDark, station,
    );

    for (const dx of [-0.72, 0.72]) {
      for (const dz of [-0.32, 0.32]) {
        box(
          0.075, 0.87, 0.075,
          dx, 0.45, dz,
          metal, station,
        );
      }
    }

    // Monitor frame
    box(
      0.82, 0.54, 0.075,
      0, 1.36, -0.21,
      black, station,
    );

    box(
      0.72, 0.43, 0.012,
      0, 1.37, -0.165,
      display, station,
    );

    // Display UI blocks
    box(
      0.12, 0.29, 0.014,
      -0.25, 1.36, -0.154,
      screen, station,
    );

    box(
      0.36, 0.07, 0.014,
      0.08, 1.47, -0.153,
      white, station,
    );

    box(
      0.36, 0.13, 0.014,
      0.08, 1.32, -0.153,
      mat("#4e91b2"), station,
    );

    box(
      0.065, 0.23, 0.065,
      0, 1.06, -0.21,
      metal, station,
    );

    box(
      0.32, 0.025, 0.22,
      0, 0.96, -0.21,
      metal, station,
    );

    // Keyboard and mouse
    box(
      0.58, 0.035, 0.18,
      0, 1.035, 0.16,
      black, station,
    );

    box(
      0.11, 0.04, 0.17,
      0.49, 1.035, 0.16,
      white, station,
    );

    // Desk lamp
    cylinder(
      0.13, 0.13, 0.04,
      -0.66, 1.04, -0.22,
      metal, station,
    );

    cylinder(
      0.025, 0.025, 0.38,
      -0.66, 1.24, -0.22,
      metal, station,
    );

    const shade = cylinder(
      0.07, 0.2, 0.22,
      -0.66, 1.48, -0.22,
      mat("#f0c979"), station,
    );
    shade.rotation.z = -0.2;

    createChair(station, 0, 1.05);
  }

  // Meeting room
  const meeting = new THREE.Group();
  meeting.name = "meeting-room";
  meeting.userData = {
    type: "room",
    roomId: "meeting-room",
  };
  group.add(meeting);

  const [mx, mz] = layout.meetingRoom.position;

  box(
    3.5, 0.16, 1.65,
    mx, 0.85, mz,
    wood, meeting,
  );

  box(
    0.35, 0.78, 0.4,
    mx, 0.41, mz,
    metal, meeting,
  );

  // Conference screen
  box(
    1.25, 0.74, 0.09,
    5.1, 2.15, -6.52,
    black, meeting,
  );

  box(
    1.1, 0.59, 0.012,
    5.1, 2.15, -6.46,
    display, meeting,
  );

  for (const x of layout.meetingRoom.chairsX) {
    for (const z of layout.meetingRoom.chairsZ) {
      createChair(
        meeting,
        x,
        z,
        z < mz ? -1 : 1,
      );
    }
  }

  // Lounge sofa
  const [lx, lz] = layout.lounge.position;

  box(
    3.2, 0.52, 1.05,
    lx, 0.35, lz,
    fabric, 
  );

  box(
    3.2, 0.83, 0.27,
    lx, 0.81, lz + 0.47,
    fabricDark,
  );

  for (const dx of [-1.1, 0, 1.1]) {
    box(
      0.95, 0.1, 0.78,
      lx + dx, 0.65, lz - 0.06,
      mat("#8aa6b8"),
    );
  }

  for (const dx of [-1.53, 1.53]) {
    box(
      0.18, 0.56, 1.02,
      lx + dx, 0.5, lz,
      fabricDark,
    );
  }

  box(
    1.7, 0.12, 0.95,
    lx, 0.49, lz - 1.8,
    woodLight,
  );

  for (const dx of [-0.62, 0.62]) {
    box(
      0.09, 0.42, 0.09,
      lx + dx, 0.24, lz - 1.8,
      metal,
    );
  }

  // Reception
  const [rx, rz] = layout.reception.position;

  box(
    3.4, 1.02, 0.75,
    rx, 0.52, rz,
    woodDark,
  );

  box(
    3.6, 0.13, 0.92,
    rx, 1.08, rz,
    woodLight,
  );

  box(
    1.65, 0.1, 0.045,
    rx, 0.66, rz + 0.385,
    mat("#e8c68f"),
  );

  box(
    0.78, 0.52, 0.08,
    rx, 1.48, rz - 0.13,
    black,
  );

  box(
    0.66, 0.4, 0.014,
    rx, 1.48, rz - 0.078,
    display,
  );

  // Decorative wall art
  for (const z of [-3.5, 0.5, 4.2]) {
    box(
      0.085, 1.45, 1.15,
      -9.27, 2.18, z,
      woodDark,
    );

    box(
      0.09, 1.28, 0.98,
      -9.215, 2.18, z,
      mat(z < 0 ? "#a8c8b6" : "#d6b7a2"),
    );
  }

  // Low-poly plants
  for (const [x, z] of layout.plants) {
    cylinder(
      0.32, 0.25, 0.55,
      x, 0.28, z,
      pot,
    );

    cylinder(
      0.075, 0.09, 0.72,
      x, 0.86, z,
      woodDark,
    );

    sphere(
      0.53,
      x, 1.23, z,
      green,
    );

    sphere(
      0.37,
      x - 0.28, 0.99, z + 0.12,
      greenDark,
    );

    sphere(
      0.36,
      x + 0.28, 1.05, z - 0.1,
      green,
    );
  }

  let disposed = false;

  return {
    group,

    dispose() {
      if (disposed) return;
      disposed = true;

      group.removeFromParent();
      group.clear();

      for (const geometry of geometries) {
        geometry.dispose();
      }

      for (const material of materials.values()) {
        material.dispose();
      }

      geometries.clear();
      materials.clear();
    },
  };
}
