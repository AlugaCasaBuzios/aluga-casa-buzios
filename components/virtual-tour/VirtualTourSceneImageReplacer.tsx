"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createSupabaseBrowserClient,
} from "@/lib/supabase";

const MAX_FILE_SIZE =
  25 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/webp",
  ]);

type VirtualTourSceneImageReplacerProps = {
  tourId: string;
  sceneId: string;
  sceneName: string;
};

type UploadAuthorization = {
  success: boolean;
  message?: string;
  path?: string;
  token?: string;
};

type FinalizeResponse = {
  success: boolean;
  message?: string;
};

type Status = {
  type: "success" | "error";
  message: string;
} | null;

function getImageDimensions(
  file: File
): Promise<{
  width: number;
  height: number;
}> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      const objectUrl =
        URL.createObjectURL(
          file
        );

      image.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve({
          width:
            image.naturalWidth,
          height:
            image.naturalHeight,
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "Não foi possível ler a imagem selecionada."
          )
        );
      };

      image.src = objectUrl;
    }
  );
}

export default function VirtualTourSceneImageReplacer({
  tourId,
  sceneId,
  sceneName,
}: VirtualTourSceneImageReplacerProps) {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [file, setFile] =
    useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [progress, setProgress] =
    useState("");

  const [status, setStatus] =
    useState<Status>(null);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setStatus(null);

    const selectedFile =
      event.target.files?.[0] ??
      null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      !ALLOWED_TYPES.has(
        selectedFile.type
      )
    ) {
      setStatus({
        type: "error",
        message:
          "Selecione uma imagem JPG ou WebP.",
      });

      event.target.value = "";
      setFile(null);
      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setStatus({
        type: "error",
        message:
          "A imagem deve possuir no máximo 25 MB.",
      });

      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    if (
      isSubmitting ||
      !file
    ) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      setProgress(
        "Validando a nova fotografia 360°..."
      );

      const dimensions =
        await getImageDimensions(
          file
        );

      const proportion =
        dimensions.width /
        dimensions.height;

      if (
        proportion < 1.9 ||
        proportion > 2.1
      ) {
        throw new Error(
          "A fotografia precisa ser panorâmica 360° na proporção aproximada de 2:1."
        );
      }

      setProgress(
        "Preparando o envio seguro..."
      );

      const authorizationResponse =
        await fetch(
          "/api/admin/virtual-tours/upload-url",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              tourId,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            }),
          }
        );

      const authorization =
        (await authorizationResponse.json()) as
          UploadAuthorization;

      if (
        !authorizationResponse.ok ||
        !authorization.success ||
        !authorization.path ||
        !authorization.token
      ) {
        throw new Error(
          authorization.message ??
          "Não foi possível preparar o envio da nova imagem."
        );
      }

      setProgress(
        "Enviando a nova fotografia 360°..."
      );

      const supabase =
        createSupabaseBrowserClient();

      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          "virtual-tour-images"
        )
        .uploadToSignedUrl(
          authorization.path,
          authorization.token,
          file,
          {
            contentType:
              file.type,
          }
        );

      if (uploadError) {
        console.error(
          "Erro ao substituir fotografia 360°:",
          uploadError
        );

        throw new Error(
          "Não foi possível enviar a nova fotografia 360°."
        );
      }

      setProgress(
        "Atualizando o ambiente..."
      );

      const finalizeResponse =
        await fetch(
          "/api/admin/virtual-tours/scenes/finalize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              tourId,
              sceneId,
              path:
                authorization.path,
              originalName:
                file.name,
              mimeType:
                file.type,
              size: file.size,
              width:
                dimensions.width,
              height:
                dimensions.height,
            }),
          }
        );

      const finalizeData =
        (await finalizeResponse.json()) as
          FinalizeResponse;

      if (
        !finalizeResponse.ok ||
        !finalizeData.success
      ) {
        throw new Error(
          finalizeData.message ??
          "A imagem foi enviada, mas o ambiente não pôde ser atualizado."
        );
      }

      form.reset();
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      setStatus({
        type: "success",
        message:
          "Imagem substituída com sucesso. As setas e conexões foram preservadas.",
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao substituir imagem do ambiente 360°:",
        error
      );

      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado.",
      });
    } finally {
      setIsSubmitting(false);
      setProgress("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div>
        <h4 className="text-sm font-black text-blue-950">
          Substituir fotografia 360°
        </h4>

        <p className="mt-1 text-xs leading-5 text-slate-600">
          A nova imagem substituirá a fotografia de {sceneName}. O ambiente e suas setas continuarão os mesmos.
        </p>
      </div>

      {status && (
        <div
          role="alert"
          className={`rounded-lg border px-3 py-2 text-sm font-bold ${
            status.type === "success"
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {status.message}
        </div>
      )}

      <div>
        <label
          htmlFor={`replace-scene-${sceneId}`}
          className="text-xs font-bold text-slate-700"
        >
          Nova fotografia 360°
        </label>

        <input
          ref={fileInputRef}
          id={`replace-scene-${sceneId}`}
          type="file"
          accept="image/jpeg,image/webp"
          required
          disabled={isSubmitting}
          onChange={handleFileChange}
          className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-blue-950 file:px-3 file:py-2 file:font-bold file:text-white disabled:opacity-60"
        />
      </div>

      {file && (
        <p className="text-xs font-semibold text-slate-700">
          {file.name} — {" "}
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      )}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          !file
        }
        style={{
          color: "#ffffff",
        }}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-950 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting
          ? progress ||
            "Substituindo..."
          : "Substituir imagem"}
      </button>
    </form>
  );
}
