"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Viewer,
  events,
} from "@photo-sphere-viewer/core";

import {
  VirtualTourPlugin,
  type VirtualTourNode,
} from "@photo-sphere-viewer/virtual-tour-plugin";

import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";

type HotspotPosition = {
  yaw: number;
  pitch: number;
};

type VirtualTourHotspotEditorProps = {
  panorama: string;
  fieldIdPrefix: string;
  initialYawDegrees?: number;
  initialPitchDegrees?: number;
};

const DEGREES_PER_RADIAN =
  180 / Math.PI;

function roundDegree(
  value: number
): number {
  return Math.round(value * 10) / 10;
}

function normalizeYaw(
  value: number
): number {
  let normalized = value % 360;

  if (normalized > 180) {
    normalized -= 360;
  }

  if (normalized < -180) {
    normalized += 360;
  }

  return roundDegree(normalized);
}

function clampPitch(
  value: number
): number {
  return roundDegree(
    Math.max(
      -90,
      Math.min(90, value)
    )
  );
}

function degreesToRadians(
  value: number
): number {
  return value / DEGREES_PER_RADIAN;
}

export default function VirtualTourHotspotEditor({
  panorama,
  fieldIdPrefix,
  initialYawDegrees = 0,
  initialPitchDegrees = -8,
}: VirtualTourHotspotEditorProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const markerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const viewerRef =
    useRef<Viewer | null>(null);

  const positionRef =
    useRef<HotspotPosition>({
      yaw: normalizeYaw(
        initialYawDegrees
      ),
      pitch: clampPitch(
        initialPitchDegrees
      ),
    });

  const [position, setPosition] =
    useState<HotspotPosition>(
      positionRef.current
    );

  const [pointWasSelected, setPointWasSelected] =
    useState(false);

  const [viewerError, setViewerError] =
    useState("");

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const viewerContainer =
      container;

    let viewer: Viewer | null =
      null;

    function updateMarkerPosition() {
      const marker = markerRef.current;

      const activeViewer = viewer;

      if (!marker || !activeViewer) {
        return;
      }

      const sphericalPosition = {
        yaw: degreesToRadians(
          positionRef.current.yaw
        ),
        pitch: degreesToRadians(
          positionRef.current.pitch
        ),
      };

      try {
        const isVisible =
          activeViewer.dataHelper.isPointVisible(
            sphericalPosition
          );

        if (!isVisible) {
          marker.style.display =
            "none";
          return;
        }

        const viewerPosition =
          activeViewer.dataHelper.sphericalCoordsToViewerCoords(
            sphericalPosition
          );

        marker.style.display =
          "flex";
        marker.style.left =
          `${viewerPosition.x}px`;
        marker.style.top =
          `${viewerPosition.y}px`;
      } catch {
        marker.style.display =
          "none";
      }
    }

    function selectPoint(
      event: events.ClickEvent
    ) {
      const nextPosition = {
        yaw: normalizeYaw(
          event.data.yaw *
            DEGREES_PER_RADIAN
        ),
        pitch: clampPitch(
          event.data.pitch *
            DEGREES_PER_RADIAN
        ),
      };

      positionRef.current =
        nextPosition;
      setPosition(nextPosition);
      setPointWasSelected(true);

      window.requestAnimationFrame(
        updateMarkerPosition
      );
    }

    function showPanoramaError() {
      setViewerError(
        "Não foi possível abrir esta foto 360°. Atualize a página e tente novamente."
      );
    }

    function initializeViewer() {
      if (viewer) {
        return;
      }

      const containerSize =
        viewerContainer.getBoundingClientRect();

      if (
        containerSize.width < 1 ||
        containerSize.height < 1
      ) {
        return;
      }

      setViewerError("");

      const editorNodeId =
        `hotspot-${fieldIdPrefix}`;

      const editorNodes:
        VirtualTourNode[] = [
          {
            id: editorNodeId,
            name:
              "Posicionar seta",
            panorama,
            caption:
              "Clique na passagem para posicionar a seta",
            links: [],
          },
        ];

      const initializedViewer =
        new Viewer({
          container: viewerContainer,
          caption:
            "Posicionar seta",
          defaultYaw: `${positionRef.current.yaw}deg`,
          defaultPitch: `${positionRef.current.pitch}deg`,
          defaultZoomLvl: 30,
          navbar: [
            "zoom",
            "move",
            "fullscreen",
          ],
          keyboard: "always",
          loadingTxt:
            "Carregando ambiente 360°...",
          plugins: [
            VirtualTourPlugin.withConfig({
              dataMode:
                "client",
              positionMode:
                "manual",
              renderMode:
                "3d",
              nodes:
                editorNodes,
              startNodeId:
                editorNodeId,
              preload: false,
              showLinkTooltip:
                false,
              transitionOptions: {
                showLoader: true,
                speed: "20rpm",
                effect: "fade",
                rotation: true,
              },
            }),
          ],
        });

      viewer = initializedViewer;
      viewerRef.current =
        initializedViewer;

      initializedViewer.addEventListener(
        "click",
        selectPoint
      );

      initializedViewer.addEventListener(
        "ready",
        updateMarkerPosition
      );

      initializedViewer.addEventListener(
        "position-updated",
        updateMarkerPosition
      );

      initializedViewer.addEventListener(
        "zoom-updated",
        updateMarkerPosition
      );

      initializedViewer.addEventListener(
        "size-updated",
        updateMarkerPosition
      );

      initializedViewer.addEventListener(
        "panorama-error",
        showPanoramaError
      );
    }

    const resizeObserver =
      new ResizeObserver(() => {
        const containerSize =
          viewerContainer.getBoundingClientRect();

        if (
          containerSize.width < 1 ||
          containerSize.height < 1
        ) {
          return;
        }

        initializeViewer();

        viewer?.autoSize();

        window.requestAnimationFrame(
          updateMarkerPosition
        );
      });

    resizeObserver.observe(
      viewerContainer
    );
    initializeViewer();

    return () => {
      resizeObserver.disconnect();

      const activeViewer = viewer;

      if (!activeViewer) {
        return;
      }

      activeViewer.removeEventListener(
        "click",
        selectPoint
      );

      activeViewer.removeEventListener(
        "ready",
        updateMarkerPosition
      );

      activeViewer.removeEventListener(
        "position-updated",
        updateMarkerPosition
      );

      activeViewer.removeEventListener(
        "zoom-updated",
        updateMarkerPosition
      );

      activeViewer.removeEventListener(
        "size-updated",
        updateMarkerPosition
      );

      activeViewer.removeEventListener(
        "panorama-error",
        showPanoramaError
      );

      activeViewer.destroy();
      viewerRef.current = null;
      viewer = null;
    };
  }, [panorama]);

  function changePosition(
    field: keyof HotspotPosition,
    rawValue: string
  ) {
    const numericValue =
      Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    const nextPosition = {
      ...positionRef.current,
      [field]:
        field === "yaw"
          ? normalizeYaw(
              numericValue
            )
          : clampPitch(
              numericValue
            ),
    };

    positionRef.current =
      nextPosition;
    setPosition(nextPosition);
    setPointWasSelected(true);

    viewerRef.current?.rotate({
      yaw: `${nextPosition.yaw}deg`,
      pitch: `${nextPosition.pitch}deg`,
    });
  }

  function showSelectedPoint() {
    const currentPosition =
      positionRef.current;

    viewerRef.current?.rotate({
      yaw: `${currentPosition.yaw}deg`,
      pitch: `${currentPosition.pitch}deg`,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-black text-blue-950">
          Posição visual da seta
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-600">
          Gire a foto 360° até encontrar a passagem e clique exatamente onde a seta deve aparecer.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border-2 border-sky-300 bg-slate-950 shadow-inner">
        <div
          ref={containerRef}
          className="h-[360px] w-full"
        />

        <div
          ref={markerRef}
          aria-hidden="true"
          style={{
            backgroundColor: "#0369a1",
            color: "#ffffff",
            display: "none",
            transform:
              "translate(-50%, -50%)",
          }}
          className="pointer-events-none absolute z-20 h-12 w-12 items-center justify-center rounded-full border-4 border-white text-2xl font-black shadow-xl"
        >
          ➜
        </div>

        <div
          style={{
            backgroundColor:
              "rgba(15, 23, 42, 0.88)",
            color: "#ffffff",
          }}
          className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg px-3 py-2 text-xs font-black shadow-lg"
        >
          Clique na passagem para marcar
        </div>
      </div>

      <div
        role="status"
        className={`rounded-xl border px-4 py-3 text-sm font-bold ${
          pointWasSelected
            ? "border-green-300 bg-green-50 text-green-900"
            : "border-amber-300 bg-amber-50 text-amber-900"
        }`}
      >
        {pointWasSelected
          ? "Ponto escolhido. A seta azul mostra a posição que será salva."
          : "Gire a imagem e clique no local da passagem antes de salvar."}
      </div>

      {viewerError && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {viewerError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor={`${fieldIdPrefix}-yaw`}
            className="text-xs font-bold text-slate-700"
          >
            Horizontal
          </label>

          <input
            id={`${fieldIdPrefix}-yaw`}
            name="yaw_degrees"
            type="number"
            min={-180}
            max={180}
            step="0.1"
            value={position.yaw}
            onChange={(event) =>
              changePosition(
                "yaw",
                event.target.value
              )
            }
            required
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <div>
          <label
            htmlFor={`${fieldIdPrefix}-pitch`}
            className="text-xs font-bold text-slate-700"
          >
            Vertical
          </label>

          <input
            id={`${fieldIdPrefix}-pitch`}
            name="pitch_degrees"
            type="number"
            min={-90}
            max={90}
            step="0.1"
            value={position.pitch}
            onChange={(event) =>
              changePosition(
                "pitch",
                event.target.value
              )
            }
            required
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={showSelectedPoint}
        style={{
          color: "#172554",
        }}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-blue-950 bg-white px-4 py-2 text-sm font-black text-blue-950 transition hover:bg-sky-50"
      >
        Voltar ao ponto marcado
      </button>
    </div>
  );
}
