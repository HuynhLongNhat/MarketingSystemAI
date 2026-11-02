
import * as THREE from "three";

import { createOfficeObjects } from "../objects/office-objects";
import { createOfficeCharacters } from "../characters/office-characters";

export interface OfficeSceneOptions {
  onDeskSelect?: (deskId: string | null) => void;
}

export interface OfficeSceneController {
  zoom: (factor: number) => void;
  reset: () => void;
  selectDesk: (deskId: string | null) => void;
  dispose: () => void;
}

export function createOfficeScene(
  container: HTMLDivElement,
  options: OfficeSceneOptions = {},
): OfficeSceneController {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dbe6ec");

  const camera = new THREE.OrthographicCamera(
    -13, 13, 9, -9, 0.1, 150,
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2),
  );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.cursor = "grab";
  container.appendChild(canvas);

  const officeObjects = createOfficeObjects(scene);
  const officeCharacters = createOfficeCharacters(scene);

  const hemisphere = new THREE.HemisphereLight(
    0xeaf5ff,
    0xb9a58b,
    2,
  );
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(
    0xfff0d7,
    2.8,
  );

  sun.position.set(-7, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 55;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(
    0xd3eaff,
    0.8,
  );
  fill.position.set(8, 9, -5);
  scene.add(fill);

  const highlightGeometry =
    new THREE.BoxGeometry(2.05, 0.045, 2.35);

  const highlightMaterial =
    new THREE.MeshBasicMaterial({
      color: "#22c55e",
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

  const highlight = new THREE.Mesh(
    highlightGeometry,
    highlightMaterial,
  );

  highlight.name = "selected-desk-highlight";
  highlight.visible = false;
  highlight.renderOrder = 10;
  scene.add(highlight);

  const deskGroups = new Map<string, THREE.Group>();

  for (const child of officeObjects.group.children) {
    if (
      child instanceof THREE.Group &&
      child.userData.type === "desk" &&
      typeof child.userData.deskId === "string"
    ) {
      deskGroups.set(child.userData.deskId, child);
    }
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const target = new THREE.Vector3(0, 0, 0);

  let selectedDeskId: string | null = null;
  let azimuth = Math.PI / 4;
  const elevation = 0.9;
  let zoomLevel = 1;
  let disposed = false;

  // Animation runs only while the page is visible.
  const clock = new THREE.Clock();
  const frameInterval = 1000 / 30;

  let frameId: number | null = null;
  let lastFrameTime = 0;
  let needsRender = true;

  function renderFrame(time: number) {
    frameId = null;

    if (disposed || document.hidden) return;

    if (
      time - lastFrameTime >= frameInterval ||
      needsRender
    ) {
      lastFrameTime = time;
      needsRender = false;

      officeCharacters.update(clock.getElapsedTime());
      renderer.render(scene, camera);
    }

    frameId = window.requestAnimationFrame(renderFrame);
  }

  function requestRender() {
    if (disposed) return;

    needsRender = true;

    if (document.hidden || frameId !== null) return;

    frameId = window.requestAnimationFrame(renderFrame);
  }

  function onVisibilityChange() {
    if (disposed) return;

    if (document.hidden) {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    } else {
      lastFrameTime = 0;
      requestRender();
    }
  }

  function updateCamera() {
    const distance = 25;

    camera.position.set(
      Math.sin(azimuth) *
        Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      Math.cos(azimuth) *
        Math.cos(elevation) * distance,
    );

    camera.lookAt(target);
    camera.zoom = zoomLevel;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const halfHeight = 9;

    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();

    requestRender();
  }

  function resize() {
    if (disposed) return;

    renderer.setSize(
      Math.max(container.clientWidth, 1),
      Math.max(container.clientHeight, 1),
    );

    updateCamera();
  }

  function selectDesk(deskId: string | null) {
    if (disposed) return;

    const nextId =
      deskId && deskGroups.has(deskId)
        ? deskId
        : null;

    if (selectedDeskId === nextId) return;

    selectedDeskId = nextId;

    const desk = nextId
      ? deskGroups.get(nextId)
      : undefined;

    if (desk) {
      highlight.position.set(
        desk.position.x,
        0.035,
        desk.position.z + 0.48,
      );
      highlight.visible = true;
    } else {
      highlight.visible = false;
    }

    options.onDeskSelect?.(nextId);
    requestRender();
  }

  function findDeskId(
    object: THREE.Object3D,
  ): string | null {
    let current: THREE.Object3D | null = object;

    while (current) {
      if (
        typeof current.userData.deskId === "string"
      ) {
        return current.userData.deskId;
      }

      current = current.parent;
    }

    return null;
  }

  function pickDesk(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 -
      1;

    pointer.y =
      -((event.clientY - rect.top) / rect.height) * 2 +
      1;

    raycaster.setFromCamera(pointer, camera);

    // Both furniture and characters are selectable.
    const hits = raycaster.intersectObjects(
      [
        ...deskGroups.values(),
        officeCharacters.group,
      ],
      true,
    );

    const deskId =
      hits.length > 0
        ? findDeskId(hits[0]!.object)
        : null;

    selectDesk(deskId);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let dragging = false;
  let activePointer: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let moved = false;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;

    dragging = true;
    moved = false;
    activePointer = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;

    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (
      !dragging ||
      activePointer !== event.pointerId
    ) {
      return;
    }

    const distance = Math.hypot(
      event.clientX - startX,
      event.clientY - startY,
    );

    if (distance > 5) moved = true;

    if (moved) {
      azimuth +=
        (event.clientX - lastX) * 0.005;

      updateCamera();
    }

    lastX = event.clientX;
  }

  function onPointerUp(event: PointerEvent) {
    if (activePointer !== event.pointerId) return;

    const shouldSelect =
      event.type === "pointerup" &&
      !moved &&
      Math.hypot(
        event.clientX - startX,
        event.clientY - startY,
      ) <= 5;

    dragging = false;
    activePointer = null;
    canvas.style.cursor = "grab";

    if (shouldSelect) pickDesk(event);
  }

  function zoom(factor: number) {
    if (disposed) return;

    zoomLevel = Math.min(
      2.4,
      Math.max(0.55, zoomLevel * factor),
    );

    updateCamera();
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    zoom(event.deltaY > 0 ? 0.9 : 1.1);
  }

  function reset() {
    if (disposed) return;

    azimuth = Math.PI / 4;
    zoomLevel = 1;
    updateCamera();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      selectDesk(null);
    }
  }

  canvas.addEventListener(
    "pointerdown",
    onPointerDown,
  );
  canvas.addEventListener(
    "pointermove",
    onPointerMove,
  );
  canvas.addEventListener(
    "pointerup",
    onPointerUp,
  );
  canvas.addEventListener(
    "pointercancel",
    onPointerUp,
  );
  canvas.addEventListener(
    "lostpointercapture",
    onPointerUp,
  );
  canvas.addEventListener("wheel", onWheel, {
    passive: false,
  });

  window.addEventListener("keydown", onKeyDown);
  document.addEventListener(
    "visibilitychange",
    onVisibilityChange,
  );

  resize();
  requestRender();

  return {
    zoom,
    reset,
    selectDesk,

    dispose() {
      if (disposed) return;
      disposed = true;

      observer.disconnect();

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }

      canvas.removeEventListener(
        "pointerdown",
        onPointerDown,
      );
      canvas.removeEventListener(
        "pointermove",
        onPointerMove,
      );
      canvas.removeEventListener(
        "pointerup",
        onPointerUp,
      );
      canvas.removeEventListener(
        "pointercancel",
        onPointerUp,
      );
      canvas.removeEventListener(
        "lostpointercapture",
        onPointerUp,
      );
      canvas.removeEventListener(
        "wheel",
        onWheel,
      );

      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );

      highlightGeometry.dispose();
      highlightMaterial.dispose();
      highlight.removeFromParent();

      officeCharacters.dispose();
      officeObjects.dispose();

      sun.shadow.dispose();
      renderer.dispose();

      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }

      deskGroups.clear();
      scene.clear();
    },
  };
}
