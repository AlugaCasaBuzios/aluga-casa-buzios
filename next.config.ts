import type { NextConfig } from "next";

const baseSecurityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

const standardSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  },
];

const publicTourSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors https: http:; base-uri 'self'; object-src 'none'",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          "jbhzzbnvejpldipfljwc.supabase.co",
        port: "",
        pathname:
          "/storage/v1/object/public/property-photos/**",
        search: "",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/",
        headers:
          standardSecurityHeaders,
      },
      {
        source:
          "/:path((?!tour/).*)",
        headers:
          standardSecurityHeaders,
      },
      {
        source: "/tour/:path*",
        headers:
          publicTourSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
