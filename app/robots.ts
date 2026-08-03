import type { MetadataRoute } from "next";

const baseUrl = "https://alugacasabuzios.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/teste",
      ],
    },

    sitemap: `${baseUrl}/sitemap.xml`,

    host: baseUrl,
  };
}