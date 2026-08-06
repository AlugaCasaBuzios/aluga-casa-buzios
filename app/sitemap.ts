import type {
  MetadataRoute,
} from "next";

import {
  getActiveProperties,
} from "@/lib/propertyCatalog";

export const dynamic =
  "force-dynamic";

const baseUrl =
  "https://alugacasabuzios.com.br";

export default async function sitemap(): Promise<
  MetadataRoute.Sitemap
> {
  const properties =
    await getActiveProperties();

  const lastModified =
    new Date();

  const staticPages:
    MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified,
        changeFrequency:
          "weekly",
        priority: 1,
      },
      {
        url:
          `${baseUrl}/casas`,
        lastModified,
        changeFrequency:
          "weekly",
        priority: 0.9,
      },
      {
        url:
          `${baseUrl}/anuncie-conosco`,
        lastModified,
        changeFrequency:
          "monthly",
        priority: 0.8,
      },
      {
        url:
          `${baseUrl}/sobre`,
        lastModified,
        changeFrequency:
          "monthly",
        priority: 0.7,
      },
      {
        url:
          `${baseUrl}/contato`,
        lastModified,
        changeFrequency:
          "monthly",
        priority: 0.8,
      },
      {
        url:
          `${baseUrl}/privacidade`,
        lastModified,
        changeFrequency:
          "yearly",
        priority: 0.3,
      },
    ];

  const propertyPages:
    MetadataRoute.Sitemap =
      properties.map(
        (property) => ({
          url:
            `${baseUrl}/imoveis/${property.id}`,
          lastModified,
          changeFrequency:
            "weekly",
          priority: 0.8,
        })
      );

  return [
    ...staticPages,
    ...propertyPages,
  ];
}