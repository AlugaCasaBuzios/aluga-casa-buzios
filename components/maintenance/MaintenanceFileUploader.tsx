"use client";

import { useMemo, useState } from "react";

import type { ChangeEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase";

const STORAGE_BUCKET = "maintenance-files";
const MAX_FILES = 8;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 40 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

type AuthorizedUpload = {
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  token: string;
};

type UploadAuthorizationResponse = {
  success: boolean;
  message?: string;
  uploads?: AuthorizedUpload[];
};

type MaintenanceFileUploaderProps = {
  ticketId: string;
  accent?: "blue" | "green";
};

function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;

  return `${megabytes.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })} MB`;
}

export default function MaintenanceFileUploader({
  ticketId,
  accent = "blue",
}: MaintenanceFileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalSize = useMemo(
    () =>
      selectedFiles.reduce(
        (total, file) => total + file.size,
        0
      ),
    [selectedFiles]
  );

  const buttonClasses =
    accent === "green"
      ? "bg-emerald-700 hover:bg-emerald-800"
      : "bg-blue-950 hover:bg-blue-900";

  function handleFilesChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);

    setMessage(null);
    setUploadedPaths([]);

    if (files.length > MAX_FILES) {
      setSelectedFiles([]);
      event.target.value = "";
      setMessage({
        type: "error",
        text: `Selecione no máximo ${MAX_FILES} arquivos por atualização.`,
      });
      return;
    }

    const invalidType = files.find(
      (file) => !ALLOWED_FILE_TYPES.has(file.type.toLowerCase())
    );

    if (invalidType) {
      setSelectedFiles([]);
      event.target.value = "";
      setMessage({
        type: "error",
        text: `Formato não permitido: ${invalidType.name}. Use JPG, PNG, WebP ou PDF.`,
      });
      return;
    }

    const oversizedFile = files.find(
      (file) => file.size <= 0 || file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      setSelectedFiles([]);
      event.target.value = "";
      setMessage({
        type: "error",
        text: `${oversizedFile.name} precisa ter no máximo 10 MB.`,
      });
      return;
    }

    const filesTotalSize = files.reduce(
      (total, file) => total + file.size,
      0
    );

    if (filesTotalSize > MAX_TOTAL_SIZE) {
      setSelectedFiles([]);
      event.target.value = "";
      setMessage({
        type: "error",
        text: "O conjunto de arquivos ultrapassa o limite total de 40 MB.",
      });
      return;
    }

    setSelectedFiles(files);
  }

  async function uploadFiles() {
    if (selectedFiles.length === 0) {
      setMessage({
        type: "error",
        text: "Selecione pelo menos um arquivo.",
      });
      return;
    }

    setIsUploading(true);
    setMessage(null);
    setUploadedPaths([]);

    try {
      const authorizationResponse = await fetch(
        "/api/maintenance-files/upload-urls",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticketId,
            files: selectedFiles.map((file) => ({
              name: file.name,
              type: file.type,
              size: file.size,
            })),
          }),
        }
      );

      const authorizationData =
        (await authorizationResponse.json()) as UploadAuthorizationResponse;

      if (
        !authorizationResponse.ok ||
        !authorizationData.success ||
        !authorizationData.uploads
      ) {
        throw new Error(
          authorizationData.message ||
            "Não foi possível preparar o envio dos arquivos."
        );
      }

      const supabase = createSupabaseBrowserClient();
      const paths: string[] = [];

      for (
        let index = 0;
        index < authorizationData.uploads.length;
        index += 1
      ) {
        const upload = authorizationData.uploads[index];
        const file = selectedFiles[index];

        if (!file) {
          throw new Error(
            "Não foi possível localizar um dos arquivos selecionados."
          );
        }

        setMessage({
          type: "success",
          text: `Enviando arquivo ${index + 1} de ${selectedFiles.length}...`,
        });

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .uploadToSignedUrl(upload.path, upload.token, file, {
            contentType: upload.mimeType,
          });

        if (uploadError) {
          console.error(
            "Erro ao enviar arquivo de manutenção:",
            uploadError
          );
          throw new Error(
            `Não foi possível enviar ${file.name}.`
          );
        }

        paths.push(upload.path);
      }

      setUploadedPaths(paths);
      setMessage({
        type: "success",
        text: `${paths.length} ${
          paths.length === 1 ? "arquivo enviado" : "arquivos enviados"
        }. Agora salve a atualização do chamado.`,
      });
    } catch (error) {
      console.error("Erro no upload da manutenção:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar os arquivos.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="attachmentPaths"
        value={uploadedPaths.join("\n")}
      />

      <input
        type="hidden"
        name="attachmentUploadStatus"
        value={
          isUploading ||
          (selectedFiles.length > 0 &&
            uploadedPaths.length === 0)
            ? "pending"
            : "ready"
        }
      />

      <label className="block text-sm font-bold text-slate-700">
        Fotos / comprovantes
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleFilesChange}
          disabled={isUploading}
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-bold file:text-slate-700 disabled:opacity-60"
        />
      </label>

      <p className="text-xs leading-5 text-slate-500">
        Até 8 arquivos por atualização. JPG, PNG, WebP ou PDF, com até 10 MB cada.
      </p>

      {selectedFiles.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-bold text-slate-800">
            {selectedFiles.length}{" "}
            {selectedFiles.length === 1
              ? "arquivo selecionado"
              : "arquivos selecionados"}
          </p>
          <p className="mt-1">
            Total: {formatFileSize(totalSize)}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={uploadFiles}
        disabled={isUploading || selectedFiles.length === 0}
        className={`min-h-11 rounded-xl px-5 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonClasses}`}
      >
        {isUploading ? "Enviando..." : "Enviar arquivos"}
      </button>

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            message.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
