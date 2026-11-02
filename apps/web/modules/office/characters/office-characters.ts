
import * as THREE from "three";

import { OFFICE_LAYOUT } from "../config/office-layout";

export type OfficeAgentStatus =
  | "idle"
  | "working"
  | "thinking"
  | "offline";

export interface OfficeCharacterData {
  id: string;
  deskId: string;
  name: string;
  color: string;
  status: OfficeAgentStatus;
}

export interface OfficeCharactersController {
  group: THREE.Group;
  update: (elapsed: number) => void;
  setStatus: (
    characterId: string,
    status: OfficeAgentStatus,
  ) => void;
  dispose: () => void;
}

export const DEMO_OFFICE_CHARACTERS: readonly OfficeCharacterData[] = [
  {
    id: "demo-agent-01",
    deskId: "desk-01",
    name: "Demo Support",
    color: "#60a5fa",
    status: "working",
  },
  {
    id: "demo-agent-02",
    deskId: "desk-02",
    name: "Demo Content",
    color: "#c084fc",
    status: "thinking",
  },
  {
    id: "demo-agent-03",
    deskId: "desk-03",
    name: "Demo Research",
    color: "#34d399",
    status: "idle",
  },
  {
    id: "demo-agent-04",
    deskId: "desk-04",
    name: "Demo Analyst",
    color: "#fbbf24",
    status: "working",
  },
  {
    id: "demo-agent-05",
    deskId: "desk-05",
    name: "Demo Operations",
    color: "#fb7185",
    status: "offline",
  },
  {
    id: "demo-agent-06",
    deskId: "desk-06",
    name: "Demo Assistant",
    color: "#2dd4bf",
    status: "idle",
  },
];

interface CharacterRuntime {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  statusLight: THREE.Mesh;
  status: OfficeAgentStatus;
  phase: number;
}

const STATUS_COLORS: Record<
  OfficeAgentStatus,
  string
> = {
  idle: "#38bdf8",
  working: "#22c55e",
  thinking: "#f59e0b",
  offline: "#94a3b8",
};

export function createOfficeCharacters(
  scene: THREE.Scene,
  characters: readonly OfficeCharacterData[] =
    DEMO_OFFICE_CHARACTERS,
): OfficeCharactersController {
  const group = new THREE.Group();
  group.name = "office-characters";
  scene.add(group);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const runtimes = new Map<string, CharacterRuntime>();

  function material(
    color: string,
    options: {
      emissive?: string;
      emissiveIntensity?: number;
    } = {},
  ) {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.65,
      metalness: 0.12,
      ...options,
    });

    materials.add(value);
    return value;
  }

  function addMesh(
    geometry: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
  ) {
    geometries.add(geometry);

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    return mesh;
  }

  function box(
    parent: THREE.Group,
    size: [number, number, number],
    position: [number, number, number],
    mat: THREE.Material,
  ) {
    return addMesh(
      new THREE.BoxGeometry(...size),
      mat,
      parent,
      ...position,
    );
  }

  function sphere(
    parent: THREE.Group,
    radius: number,
    position: [number, number, number],
    mat: THREE.Material,
  ) {
    return addMesh(
      new THREE.IcosahedronGeometry(radius, 1),
      mat,
      parent,
      ...position,
    );
  }

  for (const [index, character] of characters.entries()) {
    const desk = OFFICE_LAYOUT.desks.find(
      (item) => item.id === character.deskId,
    );

    if (!desk) continue;

    const root = new THREE.Group();
    root.name = character.id;

    root.userData = {
      type: "office-character",
      characterId: character.id,
      deskId: character.deskId,
    };

    // Characters sit behind the desk.
    root.position.set(
      desk.position[0],
      0,
      desk.position[1] + 1.05,
    );

    group.add(root);

    const shell = material(character.color);
    const dark = material("#263445");
    const face = material("#dbeafe");
    const eye = material("#0f172a");
    const accent = material("#f8fafc");

    const body = new THREE.Group();
    body.position.y = 0.66;
    root.add(body);

    // Robot torso
    box(
      body,
      [0.42, 0.47, 0.28],
      [0, 0, 0],
      shell,
    );

    // Chest panel
    box(
      body,
      [0.22, 0.14, 0.025],
      [0, 0.04, -0.153],
      dark,
    );

    box(
      body,
      [0.13, 0.035, 0.027],
      [0, 0.04, -0.17],
      accent,
    );

    // Neck and head
    box(
      body,
      [0.13, 0.13, 0.13],
      [0, 0.3, 0],
      dark,
    );

    const head = new THREE.Group();
    head.position.set(0, 0.47, 0);
    body.add(head);

    box(
      head,
      [0.42, 0.37, 0.34],
      [0, 0, 0],
      face,
    );

    box(
      head,
      [0.35, 0.22, 0.025],
      [0, 0, -0.187],
      dark,
    );

    for (const x of [-0.1, 0.1]) {
      box(
        head,
        [0.055, 0.065, 0.015],
        [x, 0.025, -0.206],
        eye,
      );
    }

    // Antenna
    box(
      head,
      [0.035, 0.15, 0.035],
      [0, 0.255, 0],
      dark,
    );

    sphere(
      head,
      0.075,
      [0, 0.35, 0],
      shell,
    );

    // Arms, pivoted at shoulders
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.28, 0.14, 0);
    body.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.28, 0.14, 0);
    body.add(rightArm);

    for (const [arm, direction] of [
      [leftArm, -1],
      [rightArm, 1],
    ] as const) {
      box(
        arm,
        [0.15, 0.32, 0.16],
        [direction * 0.015, -0.17, -0.05],
        shell,
      );

      box(
        arm,
        [0.16, 0.13, 0.17],
        [direction * 0.015, -0.37, -0.1],
        face,
      );
    }

    // Legs
    for (const x of [-0.12, 0.12]) {
      box(
        root,
        [0.15, 0.32, 0.16],
        [x, 0.26, -0.1],
        dark,
      );

      box(
        root,
        [0.18, 0.11, 0.27],
        [x, 0.07, -0.18],
        shell,
      );
    }

    // Floating status indicator
    const statusMaterial = material(
      STATUS_COLORS[character.status],
      {
        emissive: STATUS_COLORS[character.status],
        emissiveIntensity: 0.5,
      },
    );

    const statusLight = sphere(
      root,
      0.105,
      [0.38, 1.55, 0],
      statusMaterial,
    );

    runtimes.set(character.id, {
      root,
      body,
      head,
      leftArm,
      rightArm,
      statusLight,
      status: character.status,
      phase: index * 1.7,
    });
  }

  let disposed = false;

  function setStatus(
    characterId: string,
    status: OfficeAgentStatus,
  ) {
    if (disposed) return;

    const runtime = runtimes.get(characterId);
    if (!runtime) return;

    runtime.status = status;

    const mat = runtime.statusLight.material;

    if (mat instanceof THREE.MeshStandardMaterial) {
      mat.color.set(STATUS_COLORS[status]);
      mat.emissive.set(STATUS_COLORS[status]);
      mat.emissiveIntensity =
        status === "offline" ? 0 : 0.5;
    }
  }

  function update(elapsed: number) {
    if (disposed) return;

    for (const runtime of runtimes.values()) {
      const t = elapsed + runtime.phase;
      const active = runtime.status !== "offline";

      runtime.body.position.y = active
        ? 0.66 + Math.sin(t * 1.6) * 0.012
        : 0.64;

      runtime.head.rotation.y =
        runtime.status === "thinking"
          ? Math.sin(t * 0.9) * 0.2
          : Math.sin(t * 0.6) * 0.06;

      runtime.head.rotation.z =
        runtime.status === "thinking" ? 0.1 : 0;

      if (runtime.status === "working") {
        runtime.leftArm.rotation.x =
          Math.sin(t * 7) * 0.22;

        runtime.rightArm.rotation.x =
          Math.sin(t * 7 + Math.PI) * 0.22;
      } else {
        runtime.leftArm.rotation.x = 0;
        runtime.rightArm.rotation.x = 0;
      }

      const scale =
        active
          ? 1 + Math.sin(t * 2.5) * 0.12
          : 0.8;

      runtime.statusLight.scale.setScalar(scale);
    }
  }

  return {
    group,
    update,
    setStatus,

    dispose() {
      if (disposed) return;
      disposed = true;

      group.removeFromParent();
      group.clear();

      for (const geometry of geometries) {
        geometry.dispose();
      }

      for (const mat of materials) {
        mat.dispose();
      }

      geometries.clear();
      materials.clear();
      runtimes.clear();
    },
  };
}
