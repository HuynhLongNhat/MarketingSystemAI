
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

  const materials = new Set<THREE.Material>();
  const materialCache = new Map<
    string,
    THREE.MeshStandardMaterial
  >();

  function material(
    color: string,
    roughness = 0.8,
  ): THREE.MeshStandardMaterial {
    const key = `${color}:${roughness}`;
    const cached = materialCache.get(key);

    if (cached) return cached;

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
    });

    materialCache.set(key, mat);
    materials.add(mat);

    return mat;
  }

  const floorMat = material("#e8d4b4");
  const wallMat = material("#f5f8fc");
  const deskMat = material("#b9875c");
  const metalMat = material("#64748b");
  const screenMat = material("#233447", 0.35);
  const chairMat = material("#516477");
  const leafMat = material("#43896b");
  const potMat = material("#c97755");

  const displayMat = new THREE.MeshStandardMaterial({
    color: "#7dd3fc",
    emissive: "#0369a1",
    emissiveIntensity: 0.35,
  });

  materials.add(displayMat);

  function addMesh(
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, mat);

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);

    return mesh;
  }

  function box(
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Group = group,
  ): THREE.Mesh {
    return addMesh(
      new THREE.BoxGeometry(width, height, depth),
      mat,
      parent,
      x,
      y,
      z,
    );
  }

  // Floor and walls
  box(
    layout.width,
    0.45,
    layout.depth,
    0,
    -0.3,
    0,
    floorMat,
  );

  box(
    layout.width,
    layout.wallHeight,
    0.3,
    0,
    1.7,
    -layout.depth / 2,
    wallMat,
  );

  box(
    0.3,
    layout.wallHeight,
    layout.depth,
    -layout.width / 2,
    1.7,
    0,
    wallMat,
  );

  box(
    layout.width,
    0.09,
    0.12,
    0,
    0.05,
    -layout.depth / 2 + 0.2,
    deskMat,
  );

  box(
    0.12,
    0.09,
    layout.depth,
    -layout.width / 2 + 0.2,
    0.05,
    0,
    deskMat,
  );

  // Zones
  for (const zone of layout.zones) {
    const [x, z] = zone.position;
    const [width, depth] = zone.size;

    const mesh = box(
      width,
      0.04,
      depth,
      x,
      -0.05,
      z,
      material(zone.color),
    );

    mesh.name = zone.id;

    mesh.userData = {
      type: "zone",
      zoneId: zone.id,
      zoneName: zone.name,
    };
  }

  // Workstations
  for (const desk of layout.desks) {
    const deskGroup = new THREE.Group();

    deskGroup.name = desk.id;
    deskGroup.userData = {
      type: "desk",
      deskId: desk.id,
    };

    const [x, z] = desk.position;

    deskGroup.position.set(x, 0, z);
    group.add(deskGroup);

    // Desktop
    box(
      1.75,
      0.13,
      0.85,
      0,
      0.92,
      0,
      deskMat,
      deskGroup,
    );

    // Desk legs
    for (const dx of [-0.72, 0.72]) {
      for (const dz of [-0.3, 0.3]) {
        box(
          0.09,
          0.9,
          0.09,
          dx,
          0.46,
          dz,
          metalMat,
          deskGroup,
        );
      }
    }

    // Monitor
    box(
      0.76,
      0.51,
      0.07,
      0,
      1.33,
      -0.2,
      screenMat,
      deskGroup,
    );

    box(
      0.64,
      0.38,
      0.015,
      0,
      1.33,
      -0.15,
      displayMat,
      deskGroup,
    );

    box(
      0.08,
      0.2,
      0.08,
      0,
      1.06,
      -0.2,
      screenMat,
      deskGroup,
    );

    // Chair
    box(
      0.6,
      0.08,
      0.3,
      0,
      0.47,
      0.93,
      chairMat,
      deskGroup,
    );

    box(
      0.6,
      0.65,
      0.11,
      0,
      0.82,
      1.22,
      chairMat,
      deskGroup,
    );

    box(
      0.1,
      0.47,
      0.1,
      0,
      0.2,
      0.93,
      metalMat,
      deskGroup,
    );
  }

  // Meeting room
  const meeting = new THREE.Group();

  meeting.name = "meeting-room";
  meeting.userData = {
    type: "room",
    roomId: "meeting-room",
  };

  group.add(meeting);

  const [meetingX, meetingZ] =
    layout.meetingRoom.position;

  box(
    3.5,
    0.15,
    1.65,
    meetingX,
    0.85,
    meetingZ,
    deskMat,
    meeting,
  );

  box(
    0.25,
    0.78,
    0.25,
    meetingX,
    0.41,
    meetingZ,
    metalMat,
    meeting,
  );

  for (const x of layout.meetingRoom.chairsX) {
    for (const z of layout.meetingRoom.chairsZ) {
      box(
        0.55,
        0.14,
        0.5,
        x,
        0.46,
        z,
        chairMat,
        meeting,
      );

      box(
        0.55,
        0.55,
        0.1,
        x,
        0.77,
        z + (z < meetingZ ? -0.24 : 0.24),
        chairMat,
        meeting,
      );
    }
  }

  // Lounge
  const [loungeX, loungeZ] =
    layout.lounge.position;

  box(
    3.2,
    0.5,
    1.05,
    loungeX,
    0.35,
    loungeZ,
    material("#7d98b8"),
  );

  box(
    3.2,
    0.8,
    0.3,
    loungeX,
    0.8,
    loungeZ + 0.48,
    material("#6d87a8"),
  );

  box(
    1.65,
    0.12,
    0.95,
    loungeX,
    0.5,
    loungeZ - 1.8,
    deskMat,
  );

  box(
    0.18,
    0.45,
    0.18,
    loungeX,
    0.24,
    loungeZ - 1.8,
    metalMat,
  );

  // Reception
  const [receptionX, receptionZ] =
    layout.reception.position;

  box(
    3.4,
    1.05,
    0.75,
    receptionX,
    0.52,
    receptionZ,
    deskMat,
  );

  box(
    3.2,
    0.12,
    0.8,
    receptionX,
    1.1,
    receptionZ,
    material("#f7eee0"),
  );

  // Wall decorations
  box(
    2.8,
    1.5,
    0.12,
    -5.1,
    2.25,
    -6.76,
    material("#a5bfd5"),
  );

  box(
    2.8,
    1.5,
    0.12,
    5.1,
    2.25,
    -6.76,
    material("#b4d4c8"),
  );

  // Plants
  for (const [x, z] of layout.plants) {
    addMesh(
      new THREE.CylinderGeometry(
        0.33,
        0.25,
        0.55,
        10,
      ),
      potMat,
      group,
      x,
      0.28,
      z,
    );

    addMesh(
      new THREE.SphereGeometry(0.62, 10, 8),
      leafMat,
      group,
      x,
      1.0,
      z,
    );
  }

  let disposed = false;

  return {
    group,

    dispose() {
      if (disposed) return;
      disposed = true;

      const geometries =
        new Set<THREE.BufferGeometry>();

      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
        }
      });

      for (const geometry of geometries) {
        geometry.dispose();
      }

      for (const mat of materials) {
        mat.dispose();
      }

      group.removeFromParent();
      group.clear();

      materials.clear();
      materialCache.clear();
    },
  };
}
