import "server-only";

import type { Property } from "@/types/Property";

import {
  createSupabaseAdminClient,
} from "@/lib/supabaseAdmin";

type PropertyPricingRow = {
  property_id: string;
  base_price: number | string;
  cleaning_fee: number | string | null;
  active: boolean;
};

type PropertyCatalogRow = {
  id: string;
  title: string;
  neighborhood: string;
  address: string | null;

  guests: number;
  bedrooms: number;
  bathrooms: number | string;
  beds: number;
  suites: number;
  area: number | string;
  garage: number;

  pet_friendly: boolean;
  pool: boolean;
  barbecue: boolean;
  wifi: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  washing_machine: boolean;

  beach_distance: string;

  checkin: string;
  checkout: string;

  image: string;
  gallery: string[] | null;

  description: string;
  amenities: string[] | null;
  rules: string[] | null;

  airbnb: string;
  booking: string | null;
  whatsapp: string;

  rating: number | string;
  reviews: number;

  latitude: number | null;
  longitude: number | null;

  keywords: string[] | null;

  active: boolean;
  featured: boolean;
  display_order: number;
};

export type AdminProperty =
  Property & {
    active: boolean;
    featured: boolean;
    displayOrder: number;
  };

const PROPERTY_SELECT = `
  id,
  title,
  neighborhood,
  address,
  guests,
  bedrooms,
  bathrooms,
  beds,
  suites,
  area,
  garage,
  pet_friendly,
  pool,
  barbecue,
  wifi,
  air_conditioning,
  kitchen,
  washing_machine,
  beach_distance,
  checkin,
  checkout,
  image,
  gallery,
  description,
  amenities,
  rules,
  airbnb,
  booking,
  whatsapp,
  rating,
  reviews,
  latitude,
  longitude,
  keywords,
  active,
  featured,
  display_order
`;

function normalizeTime(
  value: string
): string {
  return value
    .trim()
    .slice(0, 5);
}

function toFiniteNumber(
  value: number | string | null,
  fallback = 0
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

async function getPricingMap(
  propertyIds: string[]
): Promise<Map<string, PropertyPricingRow>> {
  if (propertyIds.length === 0) {
    return new Map();
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_pricing"
    )
    .select(`
      property_id,
      base_price,
      cleaning_fee,
      active
    `)
    .in(
      "property_id",
      propertyIds
    );

  if (error) {
    console.error(
      "Erro ao carregar preços dos imóveis:",
      error
    );

    return new Map();
  }

  return new Map(
    (
      (data ?? []) as PropertyPricingRow[]
    ).map((pricing) => [
      pricing.property_id,
      pricing,
    ])
  );
}

function mapProperty(
  row: PropertyCatalogRow,
  pricing:
    | PropertyPricingRow
    | undefined
): AdminProperty {
  return {
    id: row.id,
    title: row.title,
    neighborhood:
      row.neighborhood,
    address:
      row.address ?? undefined,

    guests:
      toFiniteNumber(
        row.guests,
        1
      ),
    bedrooms:
      toFiniteNumber(
        row.bedrooms
      ),
    bathrooms:
      toFiniteNumber(
        row.bathrooms
      ),
    beds:
      toFiniteNumber(
        row.beds
      ),
    suites:
      toFiniteNumber(
        row.suites
      ),
    area:
      toFiniteNumber(
        row.area
      ),
    garage:
      toFiniteNumber(
        row.garage
      ),

    petFriendly:
      row.pet_friendly,
    pool: row.pool,
    barbecue:
      row.barbecue,
    wifi: row.wifi,
    airConditioning:
      row.air_conditioning,
    kitchen: row.kitchen,
    washingMachine:
      row.washing_machine,

    beachDistance:
      row.beach_distance,

    checkin:
      normalizeTime(
        row.checkin
      ),
    checkout:
      normalizeTime(
        row.checkout
      ),

    price:
      toFiniteNumber(
        pricing?.base_price ??
          null
      ),
    cleaningFee:
      toFiniteNumber(
        pricing?.cleaning_fee ??
          null
      ),

    image: row.image,
    gallery:
      row.gallery ?? [],

    description:
      row.description,
    amenities:
      row.amenities ?? [],
    rules:
      row.rules ?? [],

    airbnb: row.airbnb,
    booking:
      row.booking ?? "",
    whatsapp:
      row.whatsapp,

    rating:
      toFiniteNumber(
        row.rating
      ),
    reviews:
      toFiniteNumber(
        row.reviews
      ),

    latitude:
      row.latitude ??
      undefined,
    longitude:
      row.longitude ??
      undefined,

    keywords:
      row.keywords ?? [],

    active: row.active,
    featured:
      row.featured,
    displayOrder:
      row.display_order,
  };
}

export async function getActiveProperties(): Promise<
  Property[]
> {
  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_catalog"
    )
    .select(
      PROPERTY_SELECT
    )
    .eq("active", true)
    .order(
      "display_order",
      {
        ascending: true,
      }
    )
    .order(
      "title",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Erro ao carregar imóveis ativos:",
      error
    );

    return [];
  }

  const rows =
    (data ??
      []) as PropertyCatalogRow[];

  const pricingMap =
    await getPricingMap(
      rows.map(
        (row) => row.id
      )
    );

  return rows.map(
    (row) =>
      mapProperty(
        row,
        pricingMap.get(row.id)
      )
  );
}

export async function getActivePropertyById(
  id: string
): Promise<Property | null> {
  const normalizedId =
    id.trim();

  if (!normalizedId) {
    return null;
  }

  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_catalog"
    )
    .select(
      PROPERTY_SELECT
    )
    .eq(
      "id",
      normalizedId
    )
    .eq(
      "active",
      true
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao carregar imóvel:",
      error
    );

    return null;
  }

  if (!data) {
    return null;
  }

  const row =
    data as PropertyCatalogRow;

  const pricingMap =
    await getPricingMap([
      row.id,
    ]);

  return mapProperty(
    row,
    pricingMap.get(row.id)
  );
}

export async function getAdminProperties(): Promise<
  AdminProperty[]
> {
  const supabase =
    createSupabaseAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "property_catalog"
    )
    .select(
      PROPERTY_SELECT
    )
    .order(
      "display_order",
      {
        ascending: true,
      }
    )
    .order(
      "title",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Erro ao carregar catálogo administrativo:",
      error
    );

    return [];
  }

  const rows =
    (data ??
      []) as PropertyCatalogRow[];

  const pricingMap =
    await getPricingMap(
      rows.map(
        (row) => row.id
      )
    );

  return rows.map(
    (row) =>
      mapProperty(
        row,
        pricingMap.get(row.id)
      )
  );
}