import type { NextConfig } from "next";

const LOCALES = ["en", "id"];
const CATEGORIES = ["backend", "frontend", "mobile", "devops", "database"];
const TYPE_DIRS = ["tutorials", "cheatsheets", "guides", "syllabi"];

const loc = LOCALES.join("|");
const cat = CATEGORIES.join("|");
const typ = TYPE_DIRS.join("|");

const nextConfig: NextConfig = {
  // Resolve this app as its own workspace root (avoids the monorepo
  // lockfile-detection warning from the content repo's package-lock.json).
  turbopack: {
    root: __dirname,
  },
  // Safety net for the flat → nested browse migration:
  // /:locale/:category/... → /:locale/browse/:category/...
  // Alternations keep /:locale/browse and /:locale/search untouched (no loops).
  async redirects() {
    return [
      {
        source: `/:locale(${loc})/:category(${cat})`,
        destination: "/:locale/browse/:category",
        permanent: true,
      },
      {
        source: `/:locale(${loc})/:category(${cat})/:technology`,
        destination: "/:locale/browse/:category/:technology",
        permanent: true,
      },
      {
        source: `/:locale(${loc})/:category(${cat})/:technology/:type(${typ})/:slug`,
        destination: "/:locale/browse/:category/:technology/:type/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
