
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type * as Three from "three";
import {
  Building2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Users,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { workforceApi } from "@/lib/workforce-api";

type Stats = {
  agents: number;
  departments: number;
};

type Position2D = [number, number];

export default function OfficePage() {
  const mountRef = useRef<HTMLDivElement>(null);

  const cameraControlsRef = useRef<null | {
    zoom: (factor: number) => void;
    reset: () => void;
  }>(null);

  const [stats, setStats] = useState<Stats>({
    agents: 0,
    departments: 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      workforceApi.listAgents(),
      workforceApi.listDepartments(),
    ])
      .then(([agents, departments]) => {
        if (!cancelled) {
          setStats({
            agents: agents.length,
            departments: departments.length,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Không tải được thống kê Agent/Department. Văn phòng 3D vẫn hoạt động.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function start() {
      const THREE = await import("three");

      if (disposed || !mount) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#dce8f1");

      const camera = new THREE.OrthographicCamera(
        -13,
        13,
        8,
        -8,
        0.1,
        150,
      );

      const target = new THREE.Vector3(0, 0, 0);

      let azimuth = Math.PI / 4;
      const elevation = 0.9;
      let zoom = 1;

      const updateCamera = () => {
        const distance = 25;

        camera.position.set(
          Math.sin(azimuth) *
            Math.cos(elevation) *
            distance,
          Math.sin(elevation) * distance,
          Math.cos(azimuth) *
            Math.cos(elevation) *
            distance,
        );

        camera.lookAt(target);
        camera.zoom = zoom;

        const aspect =
          Math.max(mount.clientWidth, 1) /
          Math.max(mount.clientHeight, 1);

        const halfHeight = 9;

        camera.left = -halfHeight * aspect;
        camera.right = halfHeight * aspect;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;

        camera.updateProjectionMatrix();
      };

      updateCamera();

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2),
      );

      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      renderer.setSize(
        mount.clientWidth,
        mount.clientHeight,
      );

      mount.appendChild(renderer.domElement);

      scene.add(
        new THREE.AmbientLight(0xffffff, 1.45),
      );

      const sun = new THREE.DirectionalLight(
        0xffffff,
        2.3,
      );

      sun.position.set(-6, 16, 9);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);

      sun.shadow.camera.left = -20;
      sun.shadow.camera.right = 20;
      sun.shadow.camera.top = 20;
      sun.shadow.camera.bottom = -20;

      scene.add(sun);

      const material = (
        color: string,
        roughness = 0.8,
      ) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness,
        });

      const floorMat = material("#e8d4b4");
      const wallMat = material("#f5f8fc");
      const deskMat = material("#b9875c");
      const deskLegMat = material("#64748b");
      const screenMat = material("#233447", 0.35);

      const displayMat =
        new THREE.MeshStandardMaterial({
          color: "#7dd3fc",
          emissive: "#0369a1",
          emissiveIntensity: 0.35,
        });

      const chairMat = material("#516477");
      const leafMat = material("#43896b");
      const potMat = material("#c97755");

      function box(
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        mat: Three.Material,
      ) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          mat,
        );

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add(mesh);

        return mesh;
      }

      // Sàn và tường văn phòng
      box(19, 0.45, 14, 0, -0.3, 0, floorMat);
      box(19, 3.8, 0.3, 0, 1.7, -7, wallMat);
      box(0.3, 3.8, 14, -9.5, 1.7, 0, wallMat);

      box(
        19,
        0.09,
        0.12,
        0,
        0.05,
        -6.8,
        deskMat,
      );

      box(
        0.12,
        0.09,
        14,
        -9.3,
        0.05,
        0,
        deskMat,
      );

      // Các khu vực trong văn phòng
      box(
        6.1,
        0.04,
        4.7,
        5.3,
        -0.05,
        -3.6,
        material("#c7e4e0"),
      );

      box(
        6.1,
        0.04,
        4.4,
        -5.1,
        -0.05,
        -3.7,
        material("#e0d5ed"),
      );

      box(
        5.9,
        0.04,
        4.5,
        5.5,
        -0.05,
        3.8,
        material("#f0dfca"),
      );

      box(
        5.9,
        0.04,
        4.5,
        -5.4,
        -0.05,
        3.8,
        material("#d7e6f2"),
      );

      // Vị trí bàn làm việc
      const deskPositions: Position2D[] = [
        [-6.3, -4.5],
        [-3.8, -4.5],
        [-6.3, -1.8],
        [-3.8, -1.8],
        [0.1, -3.7],
        [2.4, -3.7],
      ];

      for (const [x, z] of deskPositions) {
        box(
          1.75,
          0.13,
          0.85,
          x,
          0.92,
          z,
          deskMat,
        );

        for (const dx of [-0.72, 0.72]) {
          for (const dz of [-0.3, 0.3]) {
            box(
              0.09,
              0.9,
              0.09,
              x + dx,
              0.46,
              z + dz,
              deskLegMat,
            );
          }
        }

        // Màn hình máy tính
        box(
          0.76,
          0.51,
          0.07,
          x,
          1.33,
          z - 0.2,
          screenMat,
        );

        box(
          0.64,
          0.38,
          0.015,
          x,
          1.33,
          z - 0.15,
          displayMat,
        );

        box(
          0.08,
          0.2,
          0.08,
          x,
          1.06,
          z - 0.2,
          screenMat,
        );

        // Ghế làm việc
        box(
          0.6,
          0.08,
          0.3,
          x,
          0.47,
          z + 0.93,
          chairMat,
        );

        box(
          0.6,
          0.65,
          0.11,
          x,
          0.82,
          z + 1.22,
          chairMat,
        );

        box(
          0.1,
          0.47,
          0.1,
          x,
          0.2,
          z + 0.93,
          deskLegMat,
        );
      }

      // Phòng họp
      box(
        3.5,
        0.15,
        1.65,
        5.1,
        0.85,
        -3.5,
        deskMat,
      );

      box(
        0.25,
        0.78,
        0.25,
        5.1,
        0.41,
        -3.5,
        deskLegMat,
      );

      for (const x of [3.9, 5.1, 6.3]) {
        for (const z of [-4.75, -2.25]) {
          box(
            0.55,
            0.14,
            0.5,
            x,
            0.46,
            z,
            chairMat,
          );

          box(
            0.55,
            0.55,
            0.1,
            x,
            0.77,
            z + (z < -3.5 ? -0.24 : 0.24),
            chairMat,
          );
        }
      }

      // Lounge
      box(
        3.2,
        0.5,
        1.05,
        5.1,
        0.35,
        4.65,
        material("#7d98b8"),
      );

      box(
        3.2,
        0.8,
        0.3,
        5.1,
        0.8,
        5.13,
        material("#6d87a8"),
      );

      box(
        1.65,
        0.12,
        0.95,
        5.1,
        0.5,
        2.85,
        deskMat,
      );

      box(
        0.18,
        0.45,
        0.18,
        5.1,
        0.24,
        2.85,
        deskLegMat,
      );

      // Lễ tân
      box(
        3.4,
        1.05,
        0.75,
        -5.5,
        0.52,
        4.7,
        deskMat,
      );

      box(
        3.2,
        0.12,
        0.8,
        -5.5,
        1.1,
        4.7,
        material("#f7eee0"),
      );

      // Trang trí tường
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

      // Cây xanh
      function plant(x: number, z: number) {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.33,
            0.25,
            0.55,
            10,
          ),
          potMat,
        );

        pot.position.set(x, 0.28, z);
        pot.castShadow = true;
        scene.add(pot);

        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(
            0.62,
            10,
            8,
          ),
          leafMat,
        );

        foliage.position.set(x, 1.0, z);
        foliage.castShadow = true;
        scene.add(foliage);
      }

      const plantPositions: Position2D[] = [
        [-8.5, -6],
        [8.5, -6],
        [-8.5, 6],
        [8.5, 6],
        [0.1, 6],
      ];

      plantPositions.forEach(([x, z]) => {
        plant(x, z);
      });

      // Điều khiển camera
      let dragging = false;
      let lastX = 0;

      const onDown = (event: PointerEvent) => {
        dragging = true;
        lastX = event.clientX;

        renderer.domElement.setPointerCapture(
          event.pointerId,
        );
      };

      const onMove = (event: PointerEvent) => {
        if (!dragging) return;

        azimuth +=
          (event.clientX - lastX) * 0.005;

        lastX = event.clientX;
        updateCamera();
      };

      const onUp = () => {
        dragging = false;
      };

      const onWheel = (event: WheelEvent) => {
        event.preventDefault();

        zoom = Math.min(
          2.4,
          Math.max(
            0.55,
            zoom *
              (event.deltaY > 0 ? 0.9 : 1.1),
          ),
        );

        updateCamera();
      };

      const onResize = () => {
        const w = Math.max(
          mount.clientWidth,
          1,
        );

        const h = Math.max(
          mount.clientHeight,
          1,
        );

        renderer.setSize(w, h);
        updateCamera();
      };

      renderer.domElement.addEventListener(
        "pointerdown",
        onDown,
      );

      renderer.domElement.addEventListener(
        "pointermove",
        onMove,
      );

      renderer.domElement.addEventListener(
        "pointerup",
        onUp,
      );

      renderer.domElement.addEventListener(
        "pointercancel",
        onUp,
      );

      renderer.domElement.addEventListener(
        "wheel",
        onWheel,
        { passive: false },
      );

      const observer = new ResizeObserver(
        onResize,
      );

      observer.observe(mount);

      cameraControlsRef.current = {
        zoom: (factor) => {
          zoom = Math.min(
            2.4,
            Math.max(0.55, zoom * factor),
          );

          updateCamera();
        },

        reset: () => {
          azimuth = Math.PI / 4;
          zoom = 1;
          updateCamera();
        },
      };

      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });

      setReady(true);

      // Cleanup
      cleanup = () => {
        renderer.setAnimationLoop(null);
        observer.disconnect();

        renderer.domElement.removeEventListener(
          "pointerdown",
          onDown,
        );

        renderer.domElement.removeEventListener(
          "pointermove",
          onMove,
        );

        renderer.domElement.removeEventListener(
          "pointerup",
          onUp,
        );

        renderer.domElement.removeEventListener(
          "pointercancel",
          onUp,
        );

        renderer.domElement.removeEventListener(
          "wheel",
          onWheel,
        );

        cameraControlsRef.current = null;

        const mats = new Set<Three.Material>();

        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();

            const materials =
              Array.isArray(object.material)
                ? object.material
                : [object.material];

            materials.forEach((m) => {
              mats.add(m);
            });
          }
        });

        mats.forEach((m) => m.dispose());

        renderer.dispose();

        if (
          renderer.domElement.parentNode ===
          mount
        ) {
          mount.removeChild(
            renderer.domElement,
          );
        }
      };
    }

    void start().catch((err: unknown) => {
      if (!disposed) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể khởi tạo Three.js",
        );
      }
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-4" />
            AI COMPANY / OFFICE
          </div>

          <h1 className="mt-1 text-2xl font-bold">
            My AI Office{" "}
            <span className="text-sm font-normal text-muted-foreground">
              3D · V0.1
            </span>
          </h1>

          <p className="text-sm text-muted-foreground">
            Không gian văn phòng 3D — kéo chuột
            để xoay, cuộn để zoom.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/workforce?tab=agents">
            <Users className="mr-2 size-4" />
            Quản lý nhân viên
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg border bg-card px-4 py-2">
          Nhân viên AI:{" "}
          <strong>{stats.agents}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Phòng ban:{" "}
          <strong>{stats.departments}</strong>
        </div>

        <div className="rounded-lg border bg-card px-4 py-2">
          Bản dựng:{" "}
          <strong>Văn phòng 3D</strong>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-2xl border bg-slate-100">
        <div
          ref={mountRef}
          className="absolute inset-0 touch-none"
        />

        {!ready && !error && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-600">
            Đang dựng văn phòng 3D...
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            aria-label="Thu nhỏ"
            onClick={() =>
              cameraControlsRef.current?.zoom(0.8)
            }
          >
            <ZoomOut className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            aria-label="Phóng to"
            onClick={() =>
              cameraControlsRef.current?.zoom(1.25)
            }
          >
            <ZoomIn className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            aria-label="Đặt lại góc nhìn"
            onClick={() =>
              cameraControlsRef.current?.reset()
            }
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>

        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-white/85 px-3 py-2 text-xs text-slate-700 shadow-sm">
          WORKSPACE · 6 bàn · phòng họp · lễ tân · lounge
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        V0.1 chỉ dựng cảnh 3D. Số lượng nhân viên
        và phòng ban lấy từ API thật; vị trí và
        nhân vật Agent sẽ được kết nối ở V0.2.
      </p>
    </div>
  );
}
