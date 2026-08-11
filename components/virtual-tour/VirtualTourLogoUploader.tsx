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
  5 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

type VirtualTourLogoUploaderProps = {
  tourId: string;
  currentLogoUrl?: string | null;
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

export default function VirtualTourLogoUploader({
  tourId,
  currentLogoUrl,
}: VirtualTourLogoUploaderProps) {
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
          "Selecione um logotipo PNG, JPG ou WebP.",
      });

      event.target.value = "";
      setFile(null);
      return;
    }

    if (
      selectedFile.size <= 0 ||
      selectedFile.size >
        MAX_FILE_SIZE
    ) {
      setStatus({
        type: "error",
        message:
          "O logotipo deve possuir no máximo 5 MB.",
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
        "Preparando o logotipo..."
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
              purpose: "logo",
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
          "Não foi possível preparar o envio do logotipo."
        );
      }

      setProgress(
        "Enviando o logotipo..."
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
          "Erro ao enviar logotipo:",
          uploadError
        );

        throw new Error(
          "Não foi possível enviar o logotipo."
        );
      }

      setProgress(
        "Salvando a identidade visual..."
      );

      const finalizeResponse =
        await fetch(
          "/api/admin/virtual-tours/branding/finalize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              tourId,
              path:
                authorization.path,
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
          "O logotipo foi enviado, mas não pôde ser salvo."
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
          "Logotipo atualizado com sucesso.",
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao atualizar logotipo do passeio:",
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
      className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div>
        <h3 className="font-black text-blue-950">
          Logotipo do cliente
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Use PNG com fundo transparente para obter o melhor resultado.
        </p>
      </div>

      {currentLogoUrl && (
        <div className="flex min-h-24 items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentLogoUrl}
            alt="Logotipo atual do passeio"
            className="max-h-20 max-w-full object-contain"
          />
        </div>
      )}

      {status && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm font-bold ${
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
          htmlFor={`tour-logo-${tourId}`}
          className="text-sm font-bold text-slate-800"
        >
          {currentLogoUrl
            ? "Substituir logotipo"
            : "Selecionar logotipo"}
        </label>

        <input
          ref={fileInputRef}
          id={`tour-logo-${tourId}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
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
            "Atualizando..."
          : currentLogoUrl
            ? "Substituir logotipo"
            : "Enviar logotipo"}
      </button>
    </form>
  );
}
