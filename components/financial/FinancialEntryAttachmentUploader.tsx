"use client";

import {
  useMemo,
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
const MAX_FILES = 5;
const MAX_FILE_SIZE =
  10 * 1024 * 1024;
const MAX_TOTAL_SIZE =
  30 * 1024 * 1024;

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
  uploads?: AuthorizedUpload[];
};

type FinalizeResponse = {
  success: boolean;
  message?: string;
  filesRegistered?: number;
};

type FinancialEntryAttachmentUploaderProps = {
  financialEntryId: string;
  defaultIssuedAt: string;
};

type Message = {
  type: "success" | "error";
  text: string;
};

function formatFileSize(
  bytes: number
): string {
  const megabytes =
    bytes / 1024 / 1024;

  return `${megabytes.toLocaleString(
    "pt-BR",
    {
      maximumFractionDigits: 2,
    }
  )} MB`;
}

export default function FinancialEntryAttachmentUploader({
  financialEntryId,
  defaultIssuedAt,
}: FinancialEntryAttachmentUploaderProps) {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [documentType, setDocumentType] =
    useState("invoice");

  const [documentNumber, setDocumentNumber] =
    useState("");

  const [issuedAt, setIssuedAt] =
    useState(defaultIssuedAt);

  const [notes, setNotes] =
    useState("");

  const [isUploading, setIsUploading] =
    useState(false);

  const [message, setMessage] =
    useState<Message | null>(null);

  const totalSize = useMemo(
    () =>
      selectedFiles.reduce(
        (total, file) =>
          total + file.size,
        0
      ),
    [selectedFiles]
  );

  function resetFiles() {
    setSelectedFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  function handleFilesChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    setMessage(null);

    if (
      files.length < 1 ||
      files.length > MAX_FILES
    ) {
      resetFiles();
      setMessage({
        type: "error",
        text:
          `Selecione entre 1 e ${MAX_FILES} documentos.`,
      });
      return;
    }

    const invalidType =
      files.find(
        (file) =>
          !ALLOWED_FILE_TYPES.has(
            file.type.toLowerCase()
          )
      );

    if (invalidType) {
      resetFiles();
      setMessage({
        type: "error",
        text:
          `Formato não permitido: ${invalidType.name}. Use JPG, PNG, WebP ou PDF.`,
      });
      return;
    }

    const oversizedFile =
      files.find(
        (file) =>
          file.size <= 0 ||
          file.size > MAX_FILE_SIZE
      );

    if (oversizedFile) {
      resetFiles();
      setMessage({
        type: "error",
        text:
          `${oversizedFile.name} precisa ter no máximo 10 MB.`,
      });
      return;
    }

    const filesTotalSize =
      files.reduce(
        (total, file) =>
          total + file.size,
        0
      );

    if (
      filesTotalSize > MAX_TOTAL_SIZE
    ) {
      resetFiles();
      setMessage({
        type: "error",
        text:
          "O conjunto de documentos ultrapassa o limite total de 30 MB.",
      });
      return;
    }

    setSelectedFiles(files);
  }

  async function uploadDocuments() {
    if (
      selectedFiles.length === 0
    ) {
      setMessage({
        type: "error",
        text:
          "Selecione pelo menos um documento.",
      });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const authorizationResponse =
        await fetch(
          "/api/financial-entry-files/upload-urls",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              financialEntryId,
              files:
                selectedFiles.map(
                  (file) => ({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                  })
                ),
            }),
          }
        );

      const authorizationData =
        (await authorizationResponse.json()) as
          UploadAuthorizationResponse;

      if (
        !authorizationResponse.ok ||
        !authorizationData.success ||
        !authorizationData.uploads
      ) {
        throw new Error(
          authorizationData.message ||
            "Não foi possível preparar o envio dos documentos."
        );
      }

      const supabase =
        createSupabaseBrowserClient();

      const confirmedUploads:
        AuthorizedUpload[] = [];

      let uploadErrors = 0;

      for (
        let index = 0;
        index <
        authorizationData.uploads.length;
        index += 1
      ) {
        const upload =
          authorizationData.uploads[
            index
          ];

        const file =
          selectedFiles[index];

        if (!file || !upload) {
          uploadErrors += 1;
          continue;
        }

        setMessage({
          type: "success",
          text:
            `Enviando documento ${index + 1} de ${selectedFiles.length}...`,
        });

        const {
          error: uploadError,
        } = await supabase.storage
          .from(STORAGE_BUCKET)
          .uploadToSignedUrl(
            upload.path,
            upload.token,
            file,
            {
              contentType:
                upload.mimeType,
            }
          );

        if (uploadError) {
          console.error(
            "Erro ao enviar documento financeiro:",
            uploadError
          );
          uploadErrors += 1;
          continue;
        }

        confirmedUploads.push(
          upload
        );
      }

      if (
        confirmedUploads.length === 0
      ) {
        throw new Error(
          "Nenhum documento pôde ser enviado."
        );
      }

      setMessage({
        type: "success",
        text:
          "Registrando os documentos...",
      });

      const finalizeResponse =
        await fetch(
          "/api/financial-entry-files/finalize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              financialEntryId,
              documentType,
              documentNumber,
              issuedAt,
              notes,
              uploads:
                confirmedUploads.map(
                  (upload) => ({
                    originalName:
                      upload.originalName,
                    mimeType:
                      upload.mimeType,
                    size: upload.size,
                    path: upload.path,
                  })
                ),
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
            "Não foi possível registrar os documentos."
        );
      }

      resetFiles();
      setDocumentNumber("");
      setNotes("");

      setMessage({
        type: "success",
        text:
          uploadErrors > 0
            ? `${confirmedUploads.length} documento(s) registrado(s). ${uploadErrors} não pôde(ram) ser enviado(s).`
            : `${confirmedUploads.length} documento(s) registrado(s) com sucesso.`,
      });

      router.refresh();
    } catch (error) {
      console.error(
        "Erro no envio de documentos financeiros:",
        error
      );

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar os documentos.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <details className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-left">
      <summary className="cursor-pointer text-xs font-black text-sky-900">
        + Anexar documento
      </summary>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-xs font-bold text-slate-700">
          Tipo do documento
          <select
            value={documentType}
            onChange={(event) =>
              setDocumentType(
                event.target.value
              )
            }
            disabled={isUploading}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="invoice">
              Nota fiscal
            </option>
            <option value="receipt">
              Recibo
            </option>
            <option value="payment_proof">
              Comprovante de pagamento
            </option>
            <option value="other">
              Outro documento
            </option>
          </select>
        </label>

        <label className="grid gap-1 text-xs font-bold text-slate-700">
          Número do documento
          <input
            value={documentNumber}
            onChange={(event) =>
              setDocumentNumber(
                event.target.value
              )
            }
            disabled={isUploading}
            placeholder="Opcional"
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3"
          />
        </label>

        <label className="grid gap-1 text-xs font-bold text-slate-700">
          Data de emissão
          <input
            type="date"
            value={issuedAt}
            onChange={(event) =>
              setIssuedAt(
                event.target.value
              )
            }
            disabled={isUploading}
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3"
          />
        </label>

        <label className="grid gap-1 text-xs font-bold text-slate-700">
          Observação
          <input
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            disabled={isUploading}
            placeholder="Opcional"
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3"
          />
        </label>

        <label className="grid gap-1 text-xs font-bold text-slate-700">
          Arquivo
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            onChange={
              handleFilesChange
            }
            disabled={isUploading}
            className="block w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-normal file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:font-bold"
          />
        </label>

        <p className="text-[11px] leading-4 text-slate-500">
          Até 5 arquivos JPG, PNG,
          WebP ou PDF. Máximo de 10
          MB por arquivo e 30 MB no
          total.
        </p>

        {selectedFiles.length > 0 && (
          <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            {selectedFiles.length}{" "}
            documento(s) — {" "}
            {formatFileSize(
              totalSize
            )}
          </p>
        )}

        <button
          type="button"
          onClick={uploadDocuments}
          disabled={
            isUploading ||
            selectedFiles.length === 0
          }
          className="min-h-10 rounded-lg bg-sky-800 px-3 font-bold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? "Enviando..."
            : "Enviar e registrar"}
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
