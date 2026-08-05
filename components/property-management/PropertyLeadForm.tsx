"use client";

import {
  useRef,
  useState,
} from "react";

import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  sendGAEvent,
} from "@next/third-parties/google";

import {
  createSupabaseBrowserClient,
} from "@/lib/supabase";

const STORAGE_BUCKET =
  "property-lead-photos";

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
    "image/heic",
    "image/heif",
  ]);

type UploadAuthorization = {
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  token: string;
};

type CreateLeadResponse = {
  success: boolean;
  message?: string;
  leadId?: string;
  uploads?: UploadAuthorization[];
};

type FinalizeResponse = {
  success: boolean;
  message?: string;
  leadId?: string;
  photosConfirmed?: number;
  photosNotConfirmed?: number;
};

type SubmissionStatus =
  | {
      type: "success";
      message: string;
    }
  | {
      type: "error";
      message: string;
    }
  | null;

const amenities = [
  "Piscina",
  "Churrasqueira",
  "Wi-Fi",
  "Ar-condicionado",
  "Cozinha equipada",
  "Máquina de lavar",
  "Garagem",
  "Área externa",
  "Vista para o mar",
  "Aceita animais",
];

const managementNeeds = [
  "Administração completa",
  "Divulgação dos anúncios",
  "Atendimento aos hóspedes",
  "Precificação e calendário",
  "Check-in e check-out",
  "Limpeza e preparação",
];

function getTextValue(
  formData: FormData,
  fieldName: string
): string {
  const value =
    formData.get(fieldName);

  return typeof value === "string"
    ? value
    : "";
}

function getPhotoMimeType(
  file: File
): string {
  const normalizedType =
    file.type.toLowerCase();

  if (
    ALLOWED_FILE_TYPES.has(
      normalizedType
    )
  ) {
    return normalizedType;
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    extension === "jpg" ||
    extension === "jpeg"
  ) {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "heic") {
    return "image/heic";
  }

  if (extension === "heif") {
    return "image/heif";
  }

  return normalizedType;
}

function formatFileSize(
  size: number
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      maximumFractionDigits: 1,
    }
  ).format(
    size / 1024 / 1024
  );
}

export default function PropertyLeadForm() {
  const formRef =
    useRef<HTMLFormElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [photos, setPhotos] =
    useState<File[]>([]);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    progressMessage,
    setProgressMessage,
  ] = useState("");

  const [status, setStatus] =
    useState<SubmissionStatus>(null);

  function handlePhotosChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setStatus(null);

    const selectedPhotos =
      Array.from(
        event.target.files ?? []
      );

    if (
      selectedPhotos.length >
      MAX_PHOTOS
    ) {
      setStatus({
        type: "error",
        message:
          `Selecione no máximo ${MAX_PHOTOS} fotos.`,
      });

      event.target.value = "";
      setPhotos([]);

      return;
    }

    const invalidPhoto =
      selectedPhotos.find(
        (photo) =>
          !ALLOWED_FILE_TYPES.has(
            getPhotoMimeType(photo)
          )
      );

    if (invalidPhoto) {
      setStatus({
        type: "error",
        message:
          `O arquivo ${invalidPhoto.name} não possui um formato permitido.`,
      });

      event.target.value = "";
      setPhotos([]);

      return;
    }

    const oversizedPhoto =
      selectedPhotos.find(
        (photo) =>
          photo.size >
          MAX_FILE_SIZE
      );

    if (oversizedPhoto) {
      setStatus({
        type: "error",
        message:
          `A foto ${oversizedPhoto.name} possui mais de 10 MB.`,
      });

      event.target.value = "";
      setPhotos([]);

      return;
    }

    const totalSize =
      selectedPhotos.reduce(
        (total, photo) =>
          total + photo.size,
        0
      );

    if (
      totalSize >
      MAX_TOTAL_SIZE
    ) {
      setStatus({
        type: "error",
        message:
          "O conjunto de fotos deve possuir no máximo 150 MB.",
      });

      event.target.value = "";
      setPhotos([]);

      return;
    }

    setPhotos(selectedPhotos);
  }

  function removeAllPhotos() {
    setPhotos([]);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setStatus(null);
    setIsSubmitting(true);

    setProgressMessage(
      "Cadastrando os dados do imóvel..."
    );

    try {
      const formData =
        new FormData(
          event.currentTarget
        );

      const preferredContact =
        getTextValue(
          formData,
          "preferredContact"
        );

      const ownerEmail =
        getTextValue(
          formData,
          "ownerEmail"
        );

      if (
        preferredContact ===
          "email" &&
        !ownerEmail.trim()
      ) {
        throw new Error(
          "Informe seu e-mail ou selecione outra forma de contato."
        );
      }

      const searchParams =
        new URLSearchParams(
          window.location.search
        );

      const photoMetadata =
        photos.map((photo) => ({
          name: photo.name,

          type:
            getPhotoMimeType(
              photo
            ),

          size: photo.size,
        }));

      const payload = {
        ownerName:
          getTextValue(
            formData,
            "ownerName"
          ),

        ownerWhatsapp:
          getTextValue(
            formData,
            "ownerWhatsapp"
          ),

        ownerEmail,

        ownerRole:
          getTextValue(
            formData,
            "ownerRole"
          ),

        preferredContact,

        propertyName:
          getTextValue(
            formData,
            "propertyName"
          ),

        propertyType:
          getTextValue(
            formData,
            "propertyType"
          ),

        address:
          getTextValue(
            formData,
            "address"
          ),

        addressNumber:
          getTextValue(
            formData,
            "addressNumber"
          ),

        addressComplement:
          getTextValue(
            formData,
            "addressComplement"
          ),

        neighborhood:
          getTextValue(
            formData,
            "neighborhood"
          ),

        city:
          getTextValue(
            formData,
            "city"
          ),

        state:
          getTextValue(
            formData,
            "state"
          ),

        googleMapsUrl:
          getTextValue(
            formData,
            "googleMapsUrl"
          ),

        maximumGuests:
          getTextValue(
            formData,
            "maximumGuests"
          ),

        bedrooms:
          getTextValue(
            formData,
            "bedrooms"
          ),

        suites:
          getTextValue(
            formData,
            "suites"
          ),

        beds:
          getTextValue(
            formData,
            "beds"
          ),

        bathrooms:
          getTextValue(
            formData,
            "bathrooms"
          ),

        garageSpaces:
          getTextValue(
            formData,
            "garageSpaces"
          ),

        amenities:
          formData
            .getAll("amenities")
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                "string"
            ),

        managementNeeds:
          formData
            .getAll(
              "managementNeeds"
            )
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                "string"
            ),

        propertyDescription:
          getTextValue(
            formData,
            "propertyDescription"
          ),

        airbnbUrl:
          getTextValue(
            formData,
            "airbnbUrl"
          ),

        bookingUrl:
          getTextValue(
            formData,
            "bookingUrl"
          ),

        otherListingUrl:
          getTextValue(
            formData,
            "otherListingUrl"
          ),

        privacyConsent:
          formData.get(
            "privacyConsent"
          ) === "accepted",

        website:
          getTextValue(
            formData,
            "website"
          ),

        utmSource:
          searchParams.get(
            "utm_source"
          ),

        utmMedium:
          searchParams.get(
            "utm_medium"
          ),

        utmCampaign:
          searchParams.get(
            "utm_campaign"
          ),

        photos:
          photoMetadata,
      };

      const createResponse =
        await fetch(
          "/api/property-leads",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const createData =
        (await createResponse.json()) as
          CreateLeadResponse;

      if (
        !createResponse.ok ||
        !createData.success ||
        !createData.leadId
      ) {
        throw new Error(
          createData.message ||
            "Não foi possível enviar sua proposta."
        );
      }

      const leadId =
        createData.leadId;

      const authorizedUploads =
        createData.uploads ?? [];

      const confirmedUploads: Array<{
        originalName: string;
        mimeType: string;
        size: number;
        path: string;
      }> = [];

      let uploadErrors = 0;

      if (photos.length > 0) {
        const supabase =
          createSupabaseBrowserClient();

        for (
          let index = 0;
          index < photos.length;
          index += 1
        ) {
          const photo =
            photos[index];

          const upload =
            authorizedUploads[index];

          setProgressMessage(
            `Enviando foto ${
              index + 1
            } de ${photos.length}...`
          );

          if (!upload) {
            uploadErrors += 1;
            continue;
          }

          const {
            error: uploadError,
          } = await supabase.storage
            .from(
              STORAGE_BUCKET
            )
            .uploadToSignedUrl(
              upload.path,
              upload.token,
              photo,
              {
                contentType:
                  upload.mimeType,
              }
            );

          if (uploadError) {
            console.error(
              "Erro ao enviar foto:",
              uploadError
            );

            uploadErrors += 1;
            continue;
          }

          confirmedUploads.push({
            originalName:
              upload.originalName,

            mimeType:
              upload.mimeType,

            size:
              upload.size,

            path:
              upload.path,
          });
        }
      }

      setProgressMessage(
        "Finalizando sua proposta..."
      );

      const finalizeResponse =
        await fetch(
          `/api/property-leads/${leadId}/finalize`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              uploads:
                confirmedUploads,
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
            "Os dados foram recebidos, mas não foi possível finalizar a proposta."
        );
      }

      const photosNotConfirmed =
        uploadErrors +
        (finalizeData
          .photosNotConfirmed ?? 0);

      if (
        photosNotConfirmed > 0
      ) {
        setStatus({
          type: "success",

          message:
            "Sua proposta foi recebida. Algumas fotos não puderam ser enviadas, mas nossa equipe entrará em contato.",
        });
      } else {
        setStatus({
          type: "success",

          message:
            "Proposta enviada com sucesso! Nossa equipe entrará em contato pelo canal informado.",
        });
      }

      /*
       * Registra a captação no
       * Google Analytics somente
       * depois da confirmação da API.
       *
       * Nenhum dado pessoal do
       * proprietário é enviado.
       */
      sendGAEvent(
        "event",
        "generate_lead",
        {
          lead_source:
            "property_management_form",

          form_name:
            "anuncie_conosco",

          photos_confirmed:
            finalizeData
              .photosConfirmed ?? 0,

          photos_not_confirmed:
            photosNotConfirmed,

          page_path:
            window.location.pathname,
        }
      );

      formRef.current?.reset();

      removeAllPhotos();

      /*
       * Mantém o formulário e a
       * mensagem de confirmação
       * visíveis após o envio.
       */
      window.requestAnimationFrame(
        () => {
          formRef.current?.scrollIntoView(
            {
              behavior:
                "smooth",

              block:
                "start",
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "Erro no formulário:",
        error
      );

      setStatus({
        type: "error",

        message:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado. Tente novamente.",
      });

      window.requestAnimationFrame(
        () => {
          formRef.current?.scrollIntoView(
            {
              behavior:
                "smooth",

              block:
                "start",
            }
          );
        }
      );
    } finally {
      setIsSubmitting(false);
      setProgressMessage("");
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="scroll-mt-28 space-y-8"
    >
      {status && (
        <div
          role="alert"
          aria-live="polite"
          className={`rounded-2xl border px-5 py-4 font-semibold ${
            status.type ===
            "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {status.message}
        </div>
      )}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Seus dados
        </p>

        <h2 className="mt-3 text-2xl font-bold text-blue-950">
          Como podemos falar com você?
        </h2>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ownerName"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Nome completo *
            </label>

            <input
              id="ownerName"
              name="ownerName"
              type="text"
              required
              autoComplete="name"
              maxLength={150}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="ownerWhatsapp"
              className="mb-2 block font-semibold text-zinc-800"
            >
              WhatsApp *
            </label>

            <input
              id="ownerWhatsapp"
              name="ownerWhatsapp"
              type="tel"
              required
              autoComplete="tel"
              placeholder="(24) 99999-9999"
              maxLength={30}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="ownerEmail"
              className="mb-2 block font-semibold text-zinc-800"
            >
              E-mail
            </label>

            <input
              id="ownerEmail"
              name="ownerEmail"
              type="email"
              autoComplete="email"
              maxLength={254}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="ownerRole"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Sua relação com o imóvel
            </label>

            <select
              id="ownerRole"
              name="ownerRole"
              defaultValue="owner"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            >
              <option value="owner">
                Sou proprietário
              </option>

              <option value="authorized">
                Sou representante autorizado
              </option>

              <option value="other">
                Outra
              </option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="preferredContact"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Forma de contato preferida
            </label>

            <select
              id="preferredContact"
              name="preferredContact"
              defaultValue="whatsapp"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            >
              <option value="whatsapp">
                WhatsApp
              </option>

              <option value="phone">
                Ligação
              </option>

              <option value="email">
                E-mail
              </option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Imóvel
        </p>

        <h2 className="mt-3 text-2xl font-bold text-blue-950">
          Conte-nos sobre sua propriedade
        </h2>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="propertyName"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Nome do imóvel
            </label>

            <input
              id="propertyName"
              name="propertyName"
              type="text"
              maxLength={200}
              placeholder="Exemplo: Casa Vista Mar"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="propertyType"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Tipo do imóvel *
            </label>

            <select
              id="propertyType"
              name="propertyType"
              required
              defaultValue=""
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            >
              <option
                value=""
                disabled
              >
                Selecione
              </option>

              <option value="Casa">
                Casa
              </option>

              <option value="Apartamento">
                Apartamento
              </option>

              <option value="Flat">
                Flat
              </option>

              <option value="Pousada">
                Pousada
              </option>

              <option value="Outro">
                Outro
              </option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="address"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Rua ou endereço
            </label>

            <input
              id="address"
              name="address"
              type="text"
              maxLength={300}
              autoComplete="street-address"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="addressNumber"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Número
            </label>

            <input
              id="addressNumber"
              name="addressNumber"
              type="text"
              maxLength={30}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="addressComplement"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Complemento
            </label>

            <input
              id="addressComplement"
              name="addressComplement"
              type="text"
              maxLength={150}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="neighborhood"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Bairro *
            </label>

            <input
              id="neighborhood"
              name="neighborhood"
              type="text"
              required
              maxLength={150}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Cidade
            </label>

            <input
              id="city"
              name="city"
              type="text"
              defaultValue="Armação dos Búzios"
              maxLength={150}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Estado
            </label>

            <input
              id="state"
              name="state"
              type="text"
              defaultValue="RJ"
              maxLength={20}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="googleMapsUrl"
              className="mb-2 block font-semibold text-zinc-800"
            >
              Link do Google Maps
            </label>

            <input
              id="googleMapsUrl"
              name="googleMapsUrl"
              type="url"
              placeholder="https://maps.google.com/..."
              maxLength={1000}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">
          Capacidade
        </p>

        <h2 className="mt-3 text-2xl font-bold text-blue-950">
          Cômodos e estrutura
        </h2>

        <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3">
          {[
            {
              name: "maximumGuests",
              label: "Hóspedes",
              max: 100,
            },
            {
              name: "bedrooms",
              label: "Quartos",
              max: 50,
            },
            {
              name: "suites",
              label: "Suítes",
              max: 50,
            },
            {
              name: "beds",
              label: "Camas",
              max: 100,
            },
            {
              name: "bathrooms",
              label: "Banheiros",
              max: 50,
            },
            {
              name: "garageSpaces",
              label: "Vagas",
              max: 50,
            },
          ].map((field) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="mb-2 block font-semibold text-zinc-800"
              >
                {field.label}
              </label>

              <input
                id={field.name}
                name={field.name}
                type="number"
                min={
                  field.name ===
                  "maximumGuests"
                    ? 1
                    : 0
                }
                max={field.max}
                inputMode="numeric"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-blue-950">
          Comodidades
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {amenities.map(
            (amenity) => (
              <label
                key={amenity}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-4 transition hover:border-sky-500 hover:bg-sky-50"
              >
                <input
                  type="checkbox"
                  name="amenities"
                  value={amenity}
                  className="h-5 w-5 accent-sky-700"
                />

                <span className="font-medium text-zinc-700">
                  {amenity}
                </span>
              </label>
            )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-blue-950">
          Como podemos ajudar?
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {managementNeeds.map(
            (need) => (
              <label
                key={need}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-4 transition hover:border-sky-500 hover:bg-sky-50"
              >
                <input
                  type="checkbox"
                  name="managementNeeds"
                  value={need}
                  className="h-5 w-5 accent-sky-700"
                />

                <span className="font-medium text-zinc-700">
                  {need}
                </span>
              </label>
            )
          )}
        </div>

        <div className="mt-7">
          <label
            htmlFor="propertyDescription"
            className="mb-2 block font-semibold text-zinc-800"
          >
            Conte mais sobre o imóvel
          </label>

          <textarea
            id="propertyDescription"
            name="propertyDescription"
            rows={6}
            maxLength={5000}
            placeholder="Conservação, localização, diferenciais e o que você procura em uma administração..."
            className="w-full resize-y rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-blue-950">
          Anúncios existentes
        </h2>

        <p className="mt-2 text-zinc-600">
          Se o imóvel já estiver anunciado, informe os links.
        </p>

        <div className="mt-6 space-y-5">
          <input
            name="airbnbUrl"
            type="url"
            placeholder="Link do Airbnb"
            maxLength={1000}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
          />

          <input
            name="bookingUrl"
            type="url"
            placeholder="Link da Booking"
            maxLength={1000}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
          />

          <input
            name="otherListingUrl"
            type="url"
            placeholder="Link de outro anúncio"
            maxLength={1000}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-blue-950">
          Fotos do imóvel
        </h2>

        <p className="mt-2 leading-7 text-zinc-600">
          Selecione até 25 fotos. Cada arquivo pode ter no máximo 10 MB.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handlePhotosChange}
          className="mt-6 block w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-zinc-700 file:mr-4 file:rounded-full file:border-0 file:bg-blue-950 file:px-5 file:py-3 file:font-bold file:text-white hover:border-sky-600"
        />

        {photos.length > 0 && (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-blue-950">
                {photos.length}{" "}
                {photos.length === 1
                  ? "foto selecionada"
                  : "fotos selecionadas"}
              </p>

              <button
                type="button"
                onClick={removeAllPhotos}
                className="font-semibold text-red-700 hover:text-red-900"
              >
                Remover fotos
              </button>
            </div>

            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm text-zinc-600">
              {photos.map(
                (
                  photo,
                  index
                ) => (
                  <li
                    key={`${photo.name}-${photo.size}-${index}`}
                    className="flex justify-between gap-4"
                  >
                    <span className="truncate">
                      {index + 1}.{" "}
                      {photo.name}
                    </span>

                    <span className="shrink-0">
                      {formatFileSize(
                        photo.size
                      )}{" "}
                      MB
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </section>

      <div className="hidden">
        <label htmlFor="website">
          Não preencha este campo
        </label>

        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="privacyConsent"
            value="accepted"
            required
            className="mt-1 h-5 w-5 shrink-0 accent-sky-700"
          />

          <span className="leading-7 text-zinc-700">
            Autorizo o contato da Aluga Casa Búzios e o tratamento dos dados enviados conforme a Política de Privacidade. *
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-7 w-full rounded-2xl bg-green-600 px-7 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isSubmitting
            ? progressMessage ||
              "Enviando..."
            : "Quero anunciar meu imóvel"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-500">
          O envio pode demorar alguns minutos dependendo da quantidade de fotos.
        </p>
      </section>
    </form>
  );
}