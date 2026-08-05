import {
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const STORAGE_BUCKET =
  "property-lead-photos";

const MAX_PHOTOS = 25;
const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_TOTAL_SIZE =
  150 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Map<string, string>([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/heic", "heic"],
    ["image/heif", "heif"],
  ]);

type PhotoMetadata = {
  name: string;
  type: string;
  size: number;
};

type PropertyLeadRequest = {
  ownerName?: unknown;
  ownerWhatsapp?: unknown;
  ownerEmail?: unknown;
  ownerRole?: unknown;
  preferredContact?: unknown;

  propertyName?: unknown;
  propertyType?: unknown;

  address?: unknown;
  addressNumber?: unknown;
  addressComplement?: unknown;
  neighborhood?: unknown;
  city?: unknown;
  state?: unknown;
  googleMapsUrl?: unknown;

  maximumGuests?: unknown;
  bedrooms?: unknown;
  suites?: unknown;
  beds?: unknown;
  bathrooms?: unknown;
  garageSpaces?: unknown;

  amenities?: unknown;
  managementNeeds?: unknown;
  propertyDescription?: unknown;

  airbnbUrl?: unknown;
  bookingUrl?: unknown;
  otherListingUrl?: unknown;

  privacyConsent?: unknown;

  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;

  photos?: unknown;

  /*
   * Campo invisível usado para
   * detectar envios automáticos.
   */
  website?: unknown;
};

class ValidationError extends Error {}

function optionalText(
  value: unknown,
  maximumLength = 500
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(
    0,
    maximumLength
  );
}

function requiredText(
  value: unknown,
  fieldName: string,
  maximumLength = 500
): string {
  const normalizedValue =
    optionalText(
      value,
      maximumLength
    );

  if (!normalizedValue) {
    throw new ValidationError(
      `Preencha o campo ${fieldName}.`
    );
  }

  return normalizedValue;
}

function optionalInteger(
  value: unknown,
  fieldName: string,
  minimum: number,
  maximum: number
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isInteger(
      numericValue
    ) ||
    numericValue < minimum ||
    numericValue > maximum
  ) {
    throw new ValidationError(
      `O campo ${fieldName} possui um valor inválido.`
    );
  }

  return numericValue;
}

function optionalUrl(
  value: unknown,
  fieldName: string
): string | null {
  const normalizedValue =
    optionalText(value, 1000);

  if (!normalizedValue) {
    return null;
  }

  try {
    const url =
      new URL(normalizedValue);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new ValidationError(
      `O campo ${fieldName} deve conter um endereço válido.`
    );
  }
}

function textArray(
  value: unknown,
  maximumItems = 30
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
        .map((item) =>
          item.trim().slice(0, 100)
        )
        .filter(Boolean)
    )
  ).slice(0, maximumItems);
}

function validateEmail(
  value: unknown
): string | null {
  const email =
    optionalText(value, 254);

  if (!email) {
    return null;
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new ValidationError(
      "Informe um e-mail válido."
    );
  }

  return email.toLowerCase();
}

function validateWhatsapp(
  value: unknown
): string {
  const whatsapp =
    requiredText(
      value,
      "WhatsApp",
      30
    );

  const digits =
    whatsapp.replace(/\D/g, "");

  if (
    digits.length < 10 ||
    digits.length > 15
  ) {
    throw new ValidationError(
      "Informe um número de WhatsApp válido."
    );
  }

  return whatsapp;
}

function validatePhotos(
  value: unknown
): PhotoMetadata[] {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(
      "A lista de fotos é inválida."
    );
  }

  if (
    value.length > MAX_PHOTOS
  ) {
    throw new ValidationError(
      `Selecione no máximo ${MAX_PHOTOS} fotos.`
    );
  }

  const photos =
    value.map(
      (
        item,
        index
      ): PhotoMetadata => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          throw new ValidationError(
            `A foto ${index + 1} é inválida.`
          );
        }

        const photo =
          item as Record<
            string,
            unknown
          >;

        const name =
          requiredText(
            photo.name,
            `nome da foto ${
              index + 1
            }`,
            180
          );

        const type =
          requiredText(
            photo.type,
            `tipo da foto ${
              index + 1
            }`,
            100
          ).toLowerCase();

        const size =
          Number(photo.size);

        if (
          !ALLOWED_FILE_TYPES.has(
            type
          )
        ) {
          throw new ValidationError(
            `A foto ${name} possui um formato não permitido.`
          );
        }

        if (
          !Number.isFinite(size) ||
          size <= 0 ||
          size > MAX_FILE_SIZE
        ) {
          throw new ValidationError(
            `A foto ${name} deve possuir no máximo 10 MB.`
          );
        }

        return {
          name,
          type,
          size,
        };
      }
    );

  const totalSize =
    photos.reduce(
      (
        total,
        photo
      ) =>
        total + photo.size,
      0
    );

  if (
    totalSize > MAX_TOTAL_SIZE
  ) {
    throw new ValidationError(
      "O conjunto de fotos deve possuir no máximo 150 MB."
    );
  }

  return photos;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        PropertyLeadRequest;

    /*
     * Bots normalmente preenchem
     * este campo invisível.
     */
    if (
      optionalText(
        body.website,
        200
      )
    ) {
      return NextResponse.json({
        success: true,
      });
    }

    const ownerName =
      requiredText(
        body.ownerName,
        "nome",
        150
      );

    const ownerWhatsapp =
      validateWhatsapp(
        body.ownerWhatsapp
      );

    const ownerEmail =
      validateEmail(
        body.ownerEmail
      );

    const propertyType =
      requiredText(
        body.propertyType,
        "tipo do imóvel",
        100
      );

    const neighborhood =
      requiredText(
        body.neighborhood,
        "bairro",
        150
      );

    if (
      body.privacyConsent !== true
    ) {
      throw new ValidationError(
        "É necessário aceitar a Política de Privacidade."
      );
    }

    const ownerRoleValue =
      optionalText(
        body.ownerRole,
        30
      );

    const ownerRole =
      ownerRoleValue ===
        "authorized" ||
      ownerRoleValue === "other"
        ? ownerRoleValue
        : "owner";

    const preferredContactValue =
      optionalText(
        body.preferredContact,
        30
      );

    const preferredContact =
      preferredContactValue ===
        "email" ||
      preferredContactValue ===
        "phone"
        ? preferredContactValue
        : "whatsapp";

    const photos =
      validatePhotos(body.photos);

    const supabase =
      createSupabaseAdminClient();

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from(
        "property_management_leads"
      )
      .insert({
        owner_name: ownerName,
        owner_whatsapp:
          ownerWhatsapp,
        owner_email: ownerEmail,
        owner_role: ownerRole,
        preferred_contact:
          preferredContact,

        property_name:
          optionalText(
            body.propertyName,
            200
          ),

        property_type:
          propertyType,

        address:
          optionalText(
            body.address,
            300
          ),

        address_number:
          optionalText(
            body.addressNumber,
            30
          ),

        address_complement:
          optionalText(
            body.addressComplement,
            150
          ),

        neighborhood,

        city:
          optionalText(
            body.city,
            150
          ) ||
          "Armação dos Búzios",

        state:
          optionalText(
            body.state,
            20
          ) || "RJ",

        google_maps_url:
          optionalUrl(
            body.googleMapsUrl,
            "localização do Google Maps"
          ),

        maximum_guests:
          optionalInteger(
            body.maximumGuests,
            "quantidade de hóspedes",
            1,
            100
          ),

        bedrooms:
          optionalInteger(
            body.bedrooms,
            "quartos",
            0,
            50
          ),

        suites:
          optionalInteger(
            body.suites,
            "suítes",
            0,
            50
          ),

        beds:
          optionalInteger(
            body.beds,
            "camas",
            0,
            100
          ),

        bathrooms:
          optionalInteger(
            body.bathrooms,
            "banheiros",
            0,
            50
          ),

        garage_spaces:
          optionalInteger(
            body.garageSpaces,
            "vagas de garagem",
            0,
            50
          ),

        amenities:
          textArray(
            body.amenities
          ),

        management_needs:
          textArray(
            body.managementNeeds
          ),

        property_description:
          optionalText(
            body.propertyDescription,
            5000
          ),

        airbnb_url:
          optionalUrl(
            body.airbnbUrl,
            "link do Airbnb"
          ),

        booking_url:
          optionalUrl(
            body.bookingUrl,
            "link da Booking"
          ),

        other_listing_url:
          optionalUrl(
            body.otherListingUrl,
            "outro anúncio"
          ),

        privacy_consent: true,

        source_page:
          "/anuncie-conosco",

        utm_source:
          optionalText(
            body.utmSource,
            150
          ),

        utm_medium:
          optionalText(
            body.utmMedium,
            150
          ),

        utm_campaign:
          optionalText(
            body.utmCampaign,
            150
          ),
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      console.error(
        "Erro ao cadastrar proposta:",
        leadError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível cadastrar a proposta.",
        },
        {
          status: 500,
        }
      );
    }

    const uploads = [];

    for (
      let index = 0;
      index < photos.length;
      index += 1
    ) {
      const photo =
        photos[index];

      const extension =
        ALLOWED_FILE_TYPES.get(
          photo.type
        );

      if (!extension) {
        continue;
      }

      const storagePath =
        `${lead.id}/` +
        `${String(
          index + 1
        ).padStart(2, "0")}-` +
        `${randomUUID()}.` +
        extension;

      const {
        data: signedUpload,
        error: signedUploadError,
      } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(
          storagePath
        );

      if (
        signedUploadError ||
        !signedUpload
      ) {
        console.error(
          "Erro ao autorizar foto:",
          signedUploadError
        );

        await supabase
          .from(
            "property_management_leads"
          )
          .delete()
          .eq("id", lead.id);

        return NextResponse.json(
          {
            success: false,
            message:
              "Não foi possível preparar o envio das fotos.",
          },
          {
            status: 500,
          }
        );
      }

      uploads.push({
        originalName:
          photo.name,

        mimeType:
          photo.type,

        size:
          photo.size,

        path:
          signedUpload.path,

        token:
          signedUpload.token,
      });
    }

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        uploads,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (
      error instanceof
      ValidationError
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        }
      );
    }

    console.error(
      "Erro inesperado ao cadastrar proposta:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ocorreu um erro inesperado. Tente novamente.",
      },
      {
        status: 500,
      }
    );
  }
}