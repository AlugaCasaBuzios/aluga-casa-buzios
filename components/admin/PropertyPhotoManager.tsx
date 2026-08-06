"use client";

import {
  useMemo,
  useRef,
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

type PropertyPhotoManagerProps = {
  propertyId: string;
  initialPhotos: string[];
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

function uniquePhotos(
  photos: string[]
): string[] {
  return Array.from(
    new Set(
      photos
        .map((photo) =>
          photo.trim()
        )
        .filter(Boolean)
    )
  );
}

export default function PropertyPhotoManager({
  propertyId,
  initialPhotos,
}: PropertyPhotoManagerProps) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [photos, setPhotos] =
    useState<string[]>(
      uniquePhotos(initialPhotos)
    );

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [sessionUploadedUrls, setSessionUploadedUrls] =
    useState<string[]>([]);

  const [discardedUploads, setDiscardedUploads] =
    useState<string[]>([]);

  const [isUploading, setIsUploading] =
    useState(false);

  const [message, setMessage] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

  const totalSize = useMemo(
    () =>
      selectedFiles.reduce(
        (total, file) =>
          total + file.size,
        0
      ),
    [selectedFiles]
  );

  const remainingSlots =
    MAX_PHOTOS - photos.length;

  const hasPendingSelection =
    selectedFiles.length > 0;

  function clearFileSelection() {
    setSelectedFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFilesChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    setMessage(null);

    if (remainingSlots <= 0) {
      clearFileSelection();

      setMessage({
        type: "error",
        text:
          "O imóvel já possui o limite de 25 fotos.",
      });

      return;
    }

    if (files.length > remainingSlots) {
      clearFileSelection();

      setMessage({
        type: "error",
        text:
          `Você pode adicionar no máximo ${remainingSlots} ${
            remainingSlots === 1
              ? "foto"
              : "fotos"
          } neste momento.`,
      });

      return;
    }

    const invalidType = files.find(
      (file) =>
        !ALLOWED_FILE_TYPES.has(
          file.type.toLowerCase()
        )
    );

    if (invalidType) {
      clearFileSelection();

      setMessage({
        type: "error",
        text:
          `Formato não permitido: ${invalidType.name}. Use JPG, PNG ou WebP.`,
      });

      return;
    }

    const oversizedFile = files.find(
      (file) =>
        file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      clearFileSelection();

      setMessage({
        type: "error",
        text:
          `${oversizedFile.name} ultrapassa o limite de 10 MB.`,
      });

      return;
    }

    const filesTotalSize = files.reduce(
      (total, file) =>
        total + file.size,
      0
    );

    if (filesTotalSize > MAX_TOTAL_SIZE) {
      clearFileSelection();

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
    if (selectedFiles.length === 0) {
      setMessage({
        type: "error",
        text:
          "Selecione pelo menos uma foto.",
      });

      return;
    }

    setIsUploading(true);
    setMessage(null);

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
              photos: selectedFiles.map(
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

      const uploadedPublicUrls: string[] = [];

      for (
        let index = 0;
        index < authorizationData.uploads.length;
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

      setPhotos((currentPhotos) =>
        uniquePhotos([
          ...currentPhotos,
          ...uploadedPublicUrls,
        ])
      );

      setSessionUploadedUrls(
        (currentUrls) =>
          uniquePhotos([
            ...currentUrls,
            ...uploadedPublicUrls,
          ])
      );

      setDiscardedUploads(
        (currentUrls) =>
          currentUrls.filter(
            (url) =>
              !uploadedPublicUrls.includes(url)
          )
      );

      clearFileSelection();

      setMessage({
        type: "success",
        text:
          `${uploadedPublicUrls.length} ${
            uploadedPublicUrls.length === 1
              ? "foto adicionada"
              : "fotos adicionadas"
          }. Clique em Salvar fotos para concluir.`,
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

  function makePrincipal(index: number) {
    if (index === 0) {
      return;
    }

    setPhotos((currentPhotos) => {
      const nextPhotos =
        [...currentPhotos];

      const [selectedPhoto] =
        nextPhotos.splice(index, 1);

      if (!selectedPhoto) {
        return currentPhotos;
      }

      nextPhotos.unshift(selectedPhoto);

      return nextPhotos;
    });

    setMessage({
      type: "success",
      text:
        "A foto principal foi alterada. Clique em Salvar fotos para concluir.",
    });
  }

  function movePhoto(
    index: number,
    direction: -1 | 1
  ) {
    const nextIndex =
      index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= photos.length
    ) {
      return;
    }

    setPhotos((currentPhotos) => {
      const nextPhotos =
        [...currentPhotos];

      [
        nextPhotos[index],
        nextPhotos[nextIndex],
      ] = [
        nextPhotos[nextIndex],
        nextPhotos[index],
      ];

      return nextPhotos;
    });

    setMessage({
      type: "success",
      text:
        "A ordem foi alterada. Clique em Salvar fotos para concluir.",
    });
  }

  function removePhoto(
    photoUrl: string
  ) {
    if (photos.length <= 1) {
      setMessage({
        type: "error",
        text:
          "O imóvel precisa permanecer com pelo menos uma foto.",
      });

      return;
    }

    setPhotos((currentPhotos) =>
      currentPhotos.filter(
        (photo) =>
          photo !== photoUrl
      )
    );

    if (
      sessionUploadedUrls.includes(
        photoUrl
      )
    ) {
      setDiscardedUploads(
        (currentUrls) =>
          uniquePhotos([
            ...currentUrls,
            photoUrl,
          ])
      );
    }

    setMessage({
      type: "success",
      text:
        "A foto foi marcada para remoção. Clique em Salvar fotos para concluir.",
    });
  }

  return (
    <div className="space-y-6">
      <input
        type="hidden"
        name="propertyId"
        value={propertyId}
      />

      <input
        type="hidden"
        name="photoUploadStatus"
        value={
          isUploading ||
          hasPendingSelection
            ? "pending"
            : "ready"
        }
      />

      <textarea
        name="gallery"
        value={photos.join("\n")}
        readOnly
        hidden
      />

      <textarea
        name="discardedUploads"
        value={
          discardedUploads.join("\n")
        }
        readOnly
        hidden
      />

      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Fotos do imóvel
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          A primeira foto é a imagem principal. Você pode adicionar, remover e alterar a ordem das fotos.
        </p>
      </div>

      {message && (
        <p
          role={
            message.type === "error"
              ? "alert"
              : "status"
          }
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            message.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message.text}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map(
            (photoUrl, index) => (
              <article
                key={photoUrl}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt={
                    index === 0
                      ? "Foto principal do imóvel"
                      : `Foto ${index + 1} do imóvel`
                  }
                  className="aspect-[4/3] w-full object-cover"
                />

                <div className="space-y-3 p-4">
                  <p className="font-semibold text-slate-800">
                    {index === 0
                      ? "Foto principal"
                      : `Foto ${index + 1}`}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        makePrincipal(index)
                      }
                      disabled={index === 0}
                      className="col-span-2 rounded-lg border border-blue-900 px-3 py-2 text-sm font-bold text-blue-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Tornar principal
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        movePhoto(index, -1)
                      }
                      disabled={index === 0}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Anterior
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        movePhoto(index, 1)
                      }
                      disabled={
                        index ===
                        photos.length - 1
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Próxima →
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removePhoto(photoUrl)
                      }
                      disabled={
                        photos.length <= 1
                      }
                      className="col-span-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Remover foto
                    </button>
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label
          htmlFor="additionalPropertyPhotos"
          className="mb-2 block font-semibold text-slate-800"
        >
          Adicionar novas fotos
        </label>

        <input
          ref={fileInputRef}
          id="additionalPropertyPhotos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFilesChange}
          disabled={
            isUploading ||
            remainingSlots <= 0
          }
          className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-950 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <p className="mt-2 text-sm text-slate-600">
          {photos.length} de {MAX_PHOTOS} fotos utilizadas. Cada arquivo pode ter no máximo 10 MB.
        </p>

        {selectedFiles.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">
              {selectedFiles.length}{" "}
              {selectedFiles.length === 1
                ? "foto selecionada"
                : "fotos selecionadas"}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Tamanho total:{" "}
              {formatFileSize(totalSize)}
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
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? "Enviando fotos..."
            : "Enviar novas fotos"}
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
        <button
          type="submit"
          disabled={
            isUploading ||
            hasPendingSelection ||
            photos.length === 0
          }
          className="rounded-xl bg-blue-950 px-6 py-3 font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Salvar fotos
        </button>

        <p className="self-center text-sm text-slate-500">
          As alterações só serão aplicadas depois de clicar em Salvar fotos.
        </p>
      </div>
    </div>
  );
}
