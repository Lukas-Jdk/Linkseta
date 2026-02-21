// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zbeyfoyvtenttslyoain.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Security headers moved to middleware.ts to avoid duplicate handling and to
  // ensure headers are applied only to HTML/page routes while leaving
  // static assets and API routes untouched.
};

const withNextIntl = createNextIntlPlugin(); // naudos src/i18n/request.ts automatiškai
export default withNextIntl(nextConfig);
