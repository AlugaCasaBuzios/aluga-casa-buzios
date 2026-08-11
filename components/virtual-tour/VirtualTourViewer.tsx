"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  Viewer,
} from "@photo-sphere-viewer/core";

import {
  GalleryPlugin,
} from "@photo-sphere-viewer/gallery-plugin";

import {
  AutorotatePlugin,
} from "@photo-sphere-viewer/autorotate-plugin";

import {
  GyroscopePlugin,
} from "@photo-sphere-viewer/gyroscope-plugin";

import {
  VirtualTourPlugin,
  type VirtualTourNode,
} from "@photo-sphere-viewer/virtual-tour-plugin";

import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/gallery-plugin/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";

export type VirtualTourSceneLink = {
  nodeId: string;
  yaw: number | string;
  pitch?: number | string;
};

export type VirtualTourScene = {
  id: string;
  name: string;
  panorama: string;
  thumbnail?: string;
  caption?: string;
  description?: string;
  links?: VirtualTourSceneLink[];
};

type VirtualTourViewerProps = {
  scenes: VirtualTourScene[];
  startSceneId?: string;
  title?: string;
  height?: number | string;
  className?: string;
};

function getCssHeight(
  height: number | string
): string {
  return typeof height === "number"
    ? `${height}px`
    : height;
}

export default function VirtualTourViewer({
  scenes,
  startSceneId,
  title = "Passeio virtual 360°",
  height = "70vh",
  className = "",
}: VirtualTourViewerProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const viewerRef =
    useRef<Viewer | null>(null);

  const nodes =
    useMemo<VirtualTourNode[]>(
      () => {
        const sceneIds =
          new Set(
            scenes.map(
              (scene) =>
                scene.id
            )
          );

        return scenes.map(
          (scene) => ({
            id: scene.id,
            name: scene.name,
            panorama:
              scene.panorama,
            thumbnail:
              scene.thumbnail ??
              scene.panorama,
            caption:
              scene.caption ??
              scene.name,
            description:
              scene.description,
            showInGallery: true,
            links: (
              scene.links ?? []
            )
              .filter(
                (link) =>
                  sceneIds.has(
                    link.nodeId
                  ) &&
                  link.nodeId !==
                    scene.id
              )
              .map(
                (link) => ({
                  nodeId:
                    link.nodeId,
                  position: {
                    yaw:
                      link.yaw,
                    pitch:
                      link.pitch ??
                      0,
                  },
                })
              ),
          })
        );
      },
      [scenes]
    );

  useEffect(() => {
    const container =
      containerRef.current;

    if (
      !container ||
      nodes.length === 0
    ) {
      return;
    }

    viewerRef.current?.destroy();

    const validStartSceneId =
      startSceneId &&
      nodes.some(
        (node) =>
          node.id ===
          startSceneId
      )
        ? startSceneId
        : nodes[0].id;

    const viewer = new Viewer({
      container,
      caption: title,
      defaultZoomLvl: 30,
      navbar: [
        "autorotate",
        "zoom",
        "move",
        "gallery",
        "gyroscope",
        "caption",
        "fullscreen",
      ],
      plugins: [
        AutorotatePlugin.withConfig({
          autostartDelay: 3000,
          autostartOnIdle: true,
          autorotateSpeed:
            "0.7rpm",
          autorotatePitch:
            "0deg",
          autorotateZoomLvl: 30,
        }),
        GyroscopePlugin.withConfig({
          touchmove: true,
          roll: false,
          moveMode: "smooth",
        }),
        GalleryPlugin.withConfig({
          visibleOnLoad: false,
          hideOnClick: true,
          thumbnailSize: {
            width: 150,
            height: 90,
          },
        }),
        VirtualTourPlugin.withConfig({
          dataMode: "client",
          positionMode:
            "manual",
          renderMode: "3d",
          nodes,
          startNodeId:
            validStartSceneId,
          preload: true,
          showLinkTooltip: true,
          transitionOptions: {
            showLoader: true,
            speed: "20rpm",
            effect: "fade",
            rotation: true,
          },
        }),
      ],
    });

    viewerRef.current =
      viewer;

    return () => {
      if (
        viewerRef.current ===
        viewer
      ) {
        viewerRef.current =
          null;
      }

      viewer.destroy();
    };
  }, [
    nodes,
    startSceneId,
    title,
  ]);

  const viewerHeight =
    getCssHeight(height);

  if (nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-100 px-6 text-center text-zinc-600 ${className}`}
        style={{
          height: viewerHeight,
          minHeight: "320px",
        }}
        role="status"
      >
        Nenhum ambiente 360° foi
        cadastrado para este passeio.
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl bg-zinc-950 shadow-2xl ${className}`}
    >
      <div
        ref={containerRef}
        className="w-full"
        style={{
          height: viewerHeight,
          minHeight: "320px",
        }}
        role="region"
        aria-label={title}
      />
    </div>
  );
}
