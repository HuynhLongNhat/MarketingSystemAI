
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

const STATUS_COLORS: Record<OfficeAgentStatus, string> = {
  idle: "#60a5fa",
  working: "#34d399",
  thinking: "#fbbf24",
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

  const geometries = new Map<string, THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const runtimes = new Map<string, CharacterRuntime>();

  function geometry(
    key: string,
    factory: () => THREE.BufferGeometry,
  ): THREE.BufferGeometry {
    const existing = geometries.get(key);
    if (existing) return existing;

    const result = factory();
    geometries.set(key, result);
    return result;
  }

  function material(
    color: string,
    options: {
      roughness?: number;
      metalness?: number;
      emissive?: string;
      emissiveIntensity?: number;
    } = {},
  ): THREE.MeshStandardMaterial {
    const value = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.72,
      metalness: options.metalness ?? 0.06,
      emissive: options.emissive ?? "#000000",
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });

    materials.add(value);
    return value;
  }

  function addMesh(
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const object = new THREE.Mesh(shape, surface);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(
    parent: THREE.Group,
    size: [number, number, number],
    position: [number, number, number],
    surface: THREE.Material,
  ): THREE.Mesh {
    const [w, h, d] = size;

    return addMesh(
      geometry(
        `box:${w}:${h}:${d}`,
        () => new THREE.BoxGeometry(w, h, d),
      ),
      surface,
      parent,
      ...position,
    );
  }

  function sphere(
    parent: THREE.Group,
    radius: number,
    position: [number, number, number],
    surface: THREE.Material,
  ): THREE.Mesh {
    return addMesh(
      geometry(
        `sphere:${radius}`,
        () => new THREE.SphereGeometry(radius, 12, 8),
      ),
      surface,
      parent,
      ...position,
    );
  }

  function capsule(
    parent: THREE.Group,
    radius: number,
    length: number,
    position: [number, number, number],
    surface: THREE.Material,
  ): THREE.Mesh {
    return addMesh(
      geometry(
        `capsule:${radius}:${length}`,
        () => new THREE.CapsuleGeometry(radius, length, 4, 8),
      ),
      surface,
      parent,
      ...position,
    );
  }

  for (const [index, character] of characters.entries()) {
    const desk = OFFICE_LAYOUT.desks.find(
      (item) => item.id === character.deskId,
    );

    if (!desk || runtimes.has(character.id)) continue;

    const root = new THREE.Group();
    root.name = character.id;
    root.position.set(
      desk.position[0],
      0,
      desk.position[1] + 1.05,
    );
    root.userData = {
      type: "office-character",
      characterId: character.id,
      deskId: character.deskId,
    };
    group.add(root);

    // Individual identity color, supplied by mapping.
    const shell = material(character.color);
    const shellLight = material(
      new THREE.Color(character.color)
        .lerp(new THREE.Color("#ffffff"), 0.32)
        .getStyle(),
    );
    const dark = material("#435363");
    const face = material("#f2f6f7");
    const visor = material("#344b5e", {
      roughness: 0.35,
      metalness: 0.12,
    });
    const eye = material("#c3edf4", {
      emissive: "#70c5e1",
      emissiveIntensity: 0.18,
    });
    const joint = material("#9aaeb8");
    const chest = material("#e2f2f0");

    // Character sits at the existing chair location.
    const body = new THREE.Group();
    body.position.y = 0.66;
    root.add(body);

    // Rounded torso with a soft, toy-like silhouette.
    capsule(body, 0.23, 0.18, [0, 0, 0], shell);
    box(body, [0.34, 0.12, 0.04], [0, 0.05, -0.218], shellLight);
    box(body, [0.22, 0.12, 0.028], [0, 0.02, -0.243], chest);

    // Small chest indicator.
    sphere(body, 0.035, [0, 0.02, -0.264], eye);

    // Neck.
    capsule(body, 0.065, 0.045, [0, 0.3, 0], joint);

    const head = new THREE.Group();
    head.position.set(0, 0.48, 0);
    body.add(head);

    // Larger, friendly robot head.
    sphere(head, 0.285, [0, 0, 0], face);
    box(head, [0.42, 0.2, 0.06], [0, -0.015, -0.245], visor);

    // Eyes facing the desk monitor.
    for (const x of [-0.115, 0.115]) {
      sphere(head, 0.045, [x, 0.005, -0.284], eye);
    }

    // Small antenna and colored tip.
    capsule(head, 0.022, 0.09, [0, 0.32, 0], dark);
    sphere(head, 0.07, [0, 0.405, 0], shell);

    // Side ear panels.
    for (const direction of [-1, 1]) {
      sphere(
        head,
        0.09,
        [direction * 0.275, 0, 0],
        shellLight,
      );
    }

    // Arms pivot at the shoulders.
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.27, 0.12, 0);
    body.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.27, 0.12, 0);
    body.add(rightArm);

    for (const [arm, direction] of [
      [leftArm, -1],
      [rightArm, 1],
    ] as const) {
      sphere(arm, 0.105, [0, 0, 0], shellLight);
      capsule(
        arm,
        0.09,
        0.15,
        [direction * 0.015, -0.18, -0.035],
        shell,
      );
      sphere(
        arm,
        0.09,
        [direction * 0.015, -0.33, -0.075],
        face,
      );
    }

    // Legs and feet.
    for (const x of [-0.12, 0.12]) {
      capsule(root, 0.09, 0.12, [x, 0.29, -0.1], dark);
      box(
        root,
        [0.2, 0.1, 0.29],
        [x, 0.08, -0.17],
        shell,
      );
    }

    // Status indicator: represents mapped visual status,
    // not a live task execution state.
    const statusColor = STATUS_COLORS[character.status];
    const statusMaterial = material(statusColor, {
      emissive: statusColor,
      emissiveIntensity:
        character.status === "offline" ? 0 : 0.35,
    });

    const statusLight = sphere(
      root,
      0.095,
      [0.39, 1.58, 0],
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
  ): void {
    if (disposed) return;

    const runtime = runtimes.get(characterId);
    if (!runtime) return;

    runtime.status = status;

    const surface = runtime.statusLight.material;

    if (surface instanceof THREE.MeshStandardMaterial) {
      surface.color.set(STATUS_COLORS[status]);
      surface.emissive.set(STATUS_COLORS[status]);
      surface.emissiveIntensity =
        status === "offline" ? 0 : 0.35;
    }
  }

  function update(elapsed: number): void {
    if (disposed) return;

    for (const runtime of runtimes.values()) {
      const t = elapsed + runtime.phase;
      const active = runtime.status !== "offline";

      // Calm idle movement.
      runtime.body.position.y = active
        ? 0.66 + Math.sin(t * 1.4) * 0.008
        : 0.65;

      runtime.head.rotation.y = active
        ? Math.sin(t * 0.65) * 0.055
        : 0;

      runtime.head.rotation.z =
        runtime.status === "thinking"
          ? Math.sin(t * 0.6) * 0.09
          : 0;

      // Only animate typing for explicitly supplied working state.
      if (runtime.status === "working") {
        runtime.leftArm.rotation.x =
          Math.sin(t * 5) * 0.14;
        runtime.rightArm.rotation.x =
          Math.sin(t * 5 + Math.PI) * 0.14;
      } else {
        runtime.leftArm.rotation.x = 0;
        runtime.rightArm.rotation.x = 0;
      }

      const scale = active
        ? 1 + Math.sin(t * 2) * 0.07
        : 0.85;

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

      for (const shape of geometries.values()) {
        shape.dispose();
      }

      for (const surface of materials) {
        surface.dispose();
      }

      geometries.clear();
      materials.clear();
      runtimes.clear();
    },
  };
}
