
import * as THREE from "three";

import { createOfficeObjects } from "../objects/office-objects";

export interface OfficeSceneController {
  zoom: (factor: number) => void;
  reset: () => void;
  dispose: () => void;
}

export function createOfficeScene(
  container: HTMLDivElement,
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
  container.appendChild(canvas);

  const officeObjects = createOfficeObjects(scene);

  // Soft ambient illumination
  const hemisphere = new THREE.HemisphereLight(
    0xeaf5ff,
    0xb9a58b,
    2.0,
  );
  scene.add(hemisphere);

  // Main sunlight
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

  // Fill light
  const fill = new THREE.DirectionalLight(
    0xd3eaff,
    0.8,
  );
  fill.position.set(8, 9, -5);
  scene.add(fill);

  const target = new THREE.Vector3(0, 0, 0);

  let azimuth = Math.PI / 4;
  const elevation = 0.9;
  let zoomLevel = 1;
  let disposed = false;
  let frameId: number | null = null;

  function requestRender() {
    if (disposed || frameId !== null) return;

    frameId = window.requestAnimationFrame(() => {
      frameId = null;

      if (!disposed) {
        renderer.render(scene, camera);
      }
    });
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
    const halfHeight = 9;
    const aspect = width / height;

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

  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let dragging = false;
  let activePointer: number | null = null;
  let lastX = 0;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;

    dragging = true;
    activePointer = event.pointerId;
    lastX = event.clientX;

    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (
      !dragging ||
      activePointer !== event.pointerId
    ) {
      return;
    }

    azimuth +=
      (event.clientX - lastX) * 0.005;

    lastX = event.clientX;
    updateCamera();
  }

  function onPointerUp(event: PointerEvent) {
    if (activePointer !== event.pointerId) return;

    dragging = false;
    activePointer = null;
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

  resize();

  return {
    zoom,
    reset,

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

      officeObjects.dispose();

      sun.shadow.dispose();
      renderer.dispose();

      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }

      scene.clear();
    },
  };
}
