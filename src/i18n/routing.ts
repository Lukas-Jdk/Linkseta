// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["lt", "en", "no"],
  defaultLocale: "lt",

  // svarbiausia: visada naudoti prefiksą /lt /en /no
  localePrefix: "always",
});
