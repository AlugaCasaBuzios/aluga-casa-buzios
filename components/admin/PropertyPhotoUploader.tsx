"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  ChangeEvent,
} from "react";

import {
  createSupabaseBrowserClient,
} from "@/lib/supabase";

const STORAGE_BUCKET =
  "property-photos";

const MAX_PHOTOS = 25;

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_TOTAL_SIZE =
  150 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

type AuthorizedUpload = {
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  token: string;
  publicUrl: string;
};

type UploadAuthorizationResponse = {
  success: boolean;
  message?: string;
  uploads?: AuthorizedUpload[];
};

function slugify(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function getPropertyId(): string {
  const idInput =
    document.getElementById(
      "id"
    ) as HTMLInputElement | null;

  const titleInput =
    document.getElementById(
      "title"
    ) as HTMLInputElement | null;

  return slugify(
    idInput?.value ||
      titleInput?.value ||
      ""
  );
}

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

export default function PropertyPhotoUploader() {
  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<File[]>([]);

  const [
    uploadedUrls,
    setUploadedUrls,
  ] = useState<string[]>([]);

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalSize =
    useMemo(
      () =>
        selectedFiles.reduce(
          (total, file) =>
            total + file.size,
          0
        ),
      [selectedFiles]
    );

  const hasPendingFiles =
    selectedFiles.length > 0 &&
    uploadedUrls.length === 0;

  function handleFilesChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(
        event.target.files ?? []
      );

    setMessage(null);
    setUploadedUrls([]);

    if (
      files.length > MAX_PHOTOS
    ) {
      setSelectedFiles([]);
      event.target.value = "";

      setMessage({
        type: "error",
        text:
          `Selecione no máximo ${MAX_PHOTOS} fotos.`,
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
      setSelectedFiles([]);
      event.target.value = "";

      setMessage({
        type: "error",
        text:
          `Formato não permitido: ${invalidType.name}. Use JPG, PNG ou WebP.`,
      });

      return;
    }

    const oversizedFile =
      files.find(
        (file) =>
          file.size >
          MAX_FILE_SIZE
      );

    if (oversizedFile) {
      setSelectedFiles([]);
      event.target.value = "";

      setMessage({
        type: "error",
        text:
          `${oversizedFile.name} ultrapassa o limite de 10 MB.`,
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
      filesTotalSize >
      MAX_TOTAL_SIZE
    ) {
      setSelectedFiles([]);
      event.target.value = "";

      setMessage({
        type: "error",
        text:
          "O conjunto de fotos ultrapassa o limite total de 150 MB.",
      });

      return;
    }

    setSelectedFiles(files);
  }

  async function uploadPhotos() {
    if (
      selectedFiles.length === 0
    ) {
      setMessage({
        type: "error",
        text:
          "Selecione pelo menos uma foto.",
      });

      return;
    }

    const propertyId =
      getPropertyId();

    if (!propertyId) {
      setMessage({
        type: "error",
        text:
          "Preencha o título ou o identificador do imóvel antes de enviar as fotos.",
      });

      return;
    }

    setIsUploading(true);
    setMessage(null);
    setUploadedUrls([]);

    try {
      const authorizationResponse =
        await fetch(
          "/api/admin/property-photos/upload-urls",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              propertyId,

              photos:
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
            "Não foi possível preparar o envio das fotos."
        );
      }

      const supabase =
        createSupabaseBrowserClient();

      const uploadedPublicUrls:
        string[] = [];

      for (
        let index = 0;
        index <
        authorizationData.uploads.length;
        index += 1
      ) {
        const upload =
          authorizationData.uploads[index];

        const file =
          selectedFiles[index];

        if (!file) {
          throw new Error(
            "Não foi possível localizar uma das fotos selecionadas."
          );
        }

        setMessage({
          type: "success",
          text:
            `Enviando foto ${index + 1} de ${selectedFiles.length}...`,
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
            "Erro ao enviar foto do imóvel:",
            uploadError
          );

          throw new Error(
            `Não foi possível enviar a foto ${file.name}.`
          );
        }

        uploadedPublicUrls.push(
          upload.publicUrl
        );
      }

      setUploadedUrls(
        uploadedPublicUrls
      );

      setMessage({
        type: "success",
        text:
          `${uploadedPublicUrls.length} ${
            uploadedPublicUrls.length === 1
              ? "foto enviada"
              : "fotos enviadas"
          } com sucesso.`,
      });
    } catch (error) {
      console.error(
        "Erro no upload das fotos:",
        error
      );

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar as fotos.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <input
        type="hidden"
        name="photoUploadStatus"
        value={
          isUploading ||
          hasPendingFiles
            ? "pending"
            : "ready"
        }
      />

      <input
        type="hidden"
        name="image"
        value={
          uploadedUrls[0] ?? ""
        }
      />

      <textarea
        name="gallery"
        value={
          uploadedUrls.join("\n")
        }
        readOnly
        hidden
      />

      <div>
        <label
          htmlFor="propertyPhotos"
          className="mb-2 block font-semibold text-slate-800"
        >
          Fotos da casa
        </label>

        <input
          id="propertyPhotos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={
            handleFilesChange
          }
          disabled={isUploading}
          className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-950 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <p className="mt-2 text-sm text-slate-500">
          Até 25 fotos. Cada arquivo pode ter no máximo 10 MB. Formatos: JPG, PNG e WebP.
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">
            {selectedFiles.length}{" "}
            {selectedFiles.length === 1
              ? "foto selecionada"
              : "fotos selecionadas"}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Tamanho total:{" "}
            {formatFileSize(
              totalSize
            )}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            A primeira foto será usada como imagem principal.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={uploadPhotos}
        disabled={
          isUploading ||
          selectedFiles.length === 0
        }
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading
          ? "Enviando fotos..."
          : "Enviar fotos"}
      </button>

      {message && (
        <p
          role={
            message.type ===
            "error"
              ? "alert"
              : "status"
          }
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            message.type ===
            "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message.text}
        </p>
      )}

      {uploadedUrls.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {uploadedUrls.map(
            (url, index) => (
              <figure
                key={url}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={
                    index === 0
                      ? "Foto principal enviada"
                      : `Foto enviada ${index + 1}`
                  }
                  className="aspect-[4/3] w-full object-cover"
                />

                <figcaption className="px-4 py-3 text-sm font-semibold text-slate-700">
                  {index === 0
                    ? "Foto principal"
                    : `Foto ${index + 1}`}
                </figcaption>
              </figure>
            )
          )}
        </div>
      )}
    </div>
  );
}