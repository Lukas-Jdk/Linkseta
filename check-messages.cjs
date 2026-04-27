const fs = require("fs");
const path = require("path");

const base = "lt";
const locales = ["en", "no"];

function readJson(locale) {
  const file = path.join(__dirname, "src", "messages", `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function flatten(obj, prefix = "") {
  const out = [];

  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      out.push(...flatten(value, next));
    } else {
      out.push(next);
    }
  }

  return out;
}

const lt = readJson(base);
const ltKeys = new Set(flatten(lt));

for (const locale of locales) {
  const data = readJson(locale);
  const keys = new Set(flatten(data));

  const missing = [...ltKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !ltKeys.has(key));

  console.log(`\n=== ${locale.toUpperCase()} ===`);

  if (missing.length) {
    console.log("\nMissing:");
    missing.forEach((key) => console.log(" -", key));
  } else {
    console.log("\nMissing: none ✅");
  }

  if (extra.length) {
    console.log("\nExtra:");
    extra.forEach((key) => console.log(" -", key));
  } else {
    console.log("\nExtra: none ✅");
  }
}