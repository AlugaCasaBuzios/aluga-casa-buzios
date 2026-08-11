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

type VirtualTourSceneUploaderProps = {
  tourId: string;
  nextPosition: number;
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

export default function VirtualTourSceneUploader({
  tourId,
  nextPosition,
}: VirtualTourSceneUploaderProps) {
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
      const formData =
        new FormData(
          form
        );

      const sceneName =
        String(
          formData.get("name") ??
          ""
        ).trim();

      if (sceneName.length < 2) {
        throw new Error(
          "Informe o nome do ambiente."
        );
      }

      setProgress(
        "Validando a fotografia 360°..."
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
          "Não foi possível preparar o envio da imagem."
        );
      }

      setProgress(
        "Enviando a fotografia 360°..."
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
          "Erro no upload 360°:",
          uploadError
        );

        throw new Error(
          "Não foi possível enviar a fotografia 360°."
        );
      }

      setProgress(
        "Cadastrando o ambiente..."
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
              name: sceneName,
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
              sortOrder:
                nextPosition,
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
          "A imagem foi enviada, mas o ambiente não pôde ser cadastrado."
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
          "Ambiente 360° cadastrado com sucesso.",
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao cadastrar ambiente 360°:",
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
      className="space-y-5 rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:p-6"
    >
      <div>
        <h2 className="text-xl font-black text-blue-950">
          Adicionar ambiente 360°
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Use uma imagem JPG ou WebP na
          proporção 2:1, com no máximo 25 MB.
        </p>
      </div>

      {status && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 font-bold ${
            status.type === "success"
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="scene-name"
            className="font-bold text-slate-900"
          >
            Nome do ambiente *
          </label>

          <input
            id="scene-name"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder="Ex.: Sala"
            disabled={isSubmitting}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="scene-file"
            className="font-bold text-slate-900"
          >
            Fotografia 360° *
          </label>

          <input
            ref={fileInputRef}
            id="scene-file"
            type="file"
            accept="image/jpeg,image/webp"
            required
            disabled={isSubmitting}
            onChange={handleFileChange}
            className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-950 file:px-4 file:py-2 file:font-bold file:text-white disabled:opacity-60"
          />
        </div>
      </div>

      {file && (
        <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          Arquivo selecionado: {file.name} —{" "}
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
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-950 px-6 py-3 font-black text-white shadow-md transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting
          ? progress ||
            "Enviando..."
          : "Adicionar ambiente"}
      </button>
    </form>
  );
}
