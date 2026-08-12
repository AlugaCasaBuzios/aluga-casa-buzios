"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type SceneToOptimize = {
  id: string;
  name: string;
  panoramaUrl: string;
};

type VirtualTourThumbnailOptimizerProps = {
  tourId: string;
  scenes: SceneToOptimize[];
};

type OptimizationResponse = {
  success?: boolean;
  message?: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

const THUMBNAIL_MAX_WIDTH = 1200;
const THUMBNAIL_QUALITY = 0.78;

async function createThumbnail(
  panoramaUrl: string,
  sceneId: string
): Promise<File> {
  const response =
    await fetch(
      panoramaUrl,
      {
        cache: "force-cache",
      }
    );

  if (!response.ok) {
    throw new Error(
      "Não foi possível baixar a fotografia 360°."
    );
  }

  const originalBlob =
    await response.blob();

  const image =
    await createImageBitmap(
      originalBlob
    );

  try {
    const width =
      Math.min(
        THUMBNAIL_MAX_WIDTH,
        image.width
      );

    const height =
      Math.max(
        1,
        Math.round(
          image.height *
            (width / image.width)
        )
      );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: false,
        }
      );

    if (!context) {
      throw new Error(
        "O navegador não conseguiu preparar a miniatura."
      );
    }

    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    const thumbnailBlob =
      await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
                return;
              }

              reject(
                new Error(
                  "Não foi possível criar a miniatura."
                )
              );
            },
            "image/webp",
            THUMBNAIL_QUALITY
          );
        }
      );

    return new File(
      [thumbnailBlob],
      `miniatura-${sceneId}.webp`,
      {
        type: "image/webp",
      }
    );
  } finally {
    image.close();
  }
}

export default function VirtualTourThumbnailOptimizer({
  tourId,
  scenes,
}: VirtualTourThumbnailOptimizerProps) {
  const router =
    useRouter();

  const [isOptimizing, setIsOptimizing] =
    useState(false);

  const [progress, setProgress] =
    useState("");

  const [feedback, setFeedback] =
    useState<Feedback>(null);

  async function optimizeThumbnails() {
    if (
      isOptimizing ||
      scenes.length === 0
    ) {
      return;
    }

    setIsOptimizing(true);
    setFeedback(null);

    let completed = 0;

    try {
      for (
        let index = 0;
        index < scenes.length;
        index += 1
      ) {
        const scene =
          scenes[index];

        setProgress(
          `Otimizando ${index + 1} de ${scenes.length}: ${scene.name}`
        );

        const thumbnail =
          await createThumbnail(
            scene.panoramaUrl,
            scene.id
          );

        const formData =
          new FormData();

        formData.set(
          "tour_id",
          tourId
        );

        formData.set(
          "scene_id",
          scene.id
        );

        formData.set(
          "thumbnail",
          thumbnail
        );

        const response =
          await fetch(
            "/api/admin/virtual-tours/scenes/thumbnail",
            {
              method: "POST",
              body: formData,
            }
          );

        const data =
          (await response.json()) as
            OptimizationResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ??
              `Não foi possível otimizar ${scene.name}.`
          );
        }

        completed += 1;
      }

      setFeedback({
        type: "success",
        message:
          `${completed} miniatura(s) otimizada(s) com sucesso. O editor agora carregará mais rápido.`,
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao otimizar miniaturas 360°:",
        error
      );

      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao otimizar as miniaturas.",
      });

      if (completed > 0) {
        router.refresh();
      }
    } finally {
      setIsOptimizing(false);
      setProgress("");
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-sky-300 bg-sky-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-black text-blue-950">
            Acelerar o carregamento das fotos
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            {scenes.length} ambiente(s) ainda utiliza(m) a fotografia 360° completa como prévia. Gere miniaturas leves uma única vez, sem alterar a qualidade do passeio.
          </p>
        </div>

        <button
          type="button"
          onClick={optimizeThumbnails}
          disabled={isOptimizing}
          style={{
            color: "#ffffff",
          }}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-sky-700 px-6 py-3 font-black text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:bg-slate-400"
        >
          {isOptimizing
            ? progress ||
              "Otimizando..."
            : `Otimizar ${scenes.length} miniatura(s)`}
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            feedback.type ===
            "success"
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </section>
  );
}
