"use client";

import {
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import type {
  ChangeEvent,
} from "react";

import {
  createSupabaseBrowserClient,
} from "@/lib/supabase";

const STORAGE_BUCKET =
  "financial-entry-files";
const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
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
  upload?: AuthorizedUpload;
};

type FinalizeResponse = {
  success: boolean;
  message?: string;
};

type OwnerReportPaymentAttachmentUploaderProps = {
  paymentId: string;
};

type Message = {
  type: "success" | "error";
  text: string;
};

function formatFileSize(
  bytes: number
): string {
  return `${(
    bytes /
    1024 /
    1024
  ).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })} MB`;
}

export default function OwnerReportPaymentAttachmentUploader({
  paymentId,
}: OwnerReportPaymentAttachmentUploaderProps) {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [message, setMessage] =
    useState<Message | null>(null);

  function resetFile() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ??
      null;

    setMessage(null);

    if (!file) {
      resetFile();
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.has(
        file.type.toLowerCase()
      )
    ) {
      resetFile();
      setMessage({
        type: "error",
        text:
          "Use um comprovante JPG, PNG, WebP ou PDF.",
      });
      return;
    }

    if (
      file.size <= 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      resetFile();
      setMessage({
        type: "error",
        text:
          "O comprovante precisa ter no máximo 10 MB.",
      });
      return;
    }

    setSelectedFile(file);
  }

  async function uploadAttachment() {
    if (!selectedFile) {
      setMessage({
        type: "error",
        text:
          "Selecione o comprovante.",
      });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const authorizationResponse =
        await fetch(
          "/api/owner-report-payment-files/upload-url",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              paymentId,
              file: {
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
              },
            }),
          }
        );

      const authorizationData =
        (await authorizationResponse.json()) as
          UploadAuthorizationResponse;

      if (
        !authorizationResponse.ok ||
        !authorizationData.success ||
        !authorizationData.upload
      ) {
        throw new Error(
          authorizationData.message ||
            "Não foi possível preparar o comprovante."
        );
      }

      const upload =
        authorizationData.upload;

      const supabase =
        createSupabaseBrowserClient();

      setMessage({
        type: "success",
        text:
          "Enviando comprovante...",
      });

      const { error: uploadError } =
        await supabase.storage
          .from(STORAGE_BUCKET)
          .uploadToSignedUrl(
            upload.path,
            upload.token,
            selectedFile,
            {
              contentType:
                upload.mimeType,
            }
          );

      if (uploadError) {
        console.error(
          "Erro ao enviar comprovante do pagamento:",
          uploadError
        );

        throw new Error(
          "Não foi possível enviar o comprovante."
        );
      }

      setMessage({
        type: "success",
        text:
          "Vinculando comprovante ao pagamento...",
      });

      const finalizeResponse =
        await fetch(
          "/api/owner-report-payment-files/finalize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              paymentId,
              upload: {
                originalName:
                  upload.originalName,
                mimeType:
                  upload.mimeType,
                size: upload.size,
                path: upload.path,
              },
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
          finalizeData.message ||
            "Não foi possível registrar o comprovante."
        );
      }

      resetFile();
      setMessage({
        type: "success",
        text:
          "Comprovante anexado com sucesso.",
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Erro no envio do comprovante do pagamento:",
        error
      );

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o comprovante.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <details className="w-full rounded-lg border border-sky-200 bg-sky-50 p-2 text-left sm:w-auto sm:min-w-64">
      <summary className="cursor-pointer text-xs font-black text-sky-900">
        + Anexar comprovante
      </summary>

      <div className="mt-3 grid gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-normal file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:font-bold"
        />

        {selectedFile && (
          <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            {selectedFile.name} —{" "}
            {formatFileSize(
              selectedFile.size
            )}
          </p>
        )}

        <p className="text-[11px] leading-4 text-slate-500">
          Um arquivo JPG, PNG, WebP
          ou PDF de até 10 MB.
        </p>

        <button
          type="button"
          onClick={uploadAttachment}
          disabled={
            isUploading ||
            !selectedFile
          }
          className="min-h-10 rounded-lg bg-sky-800 px-3 text-xs font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? "Enviando..."
            : "Enviar comprovante"}
        </button>

        {message && (
          <p
            role={
              message.type === "error"
                ? "alert"
                : "status"
            }
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              message.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-800"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </details>
  );
}
