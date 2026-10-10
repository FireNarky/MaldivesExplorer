import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const markdown = readFileSync("Documentation/Database_Design.md", "utf8").replace(/\r\n/g, "\n");

function fence(language, afterIndex) {
  const start = markdown.indexOf("```" + language, afterIndex);
  if (start < 0) return null;
  const bodyStart = markdown.indexOf("\n", start) + 1;
  const end = markdown.indexOf("```", bodyStart);
  return { body: markdown.slice(bodyStart, end).trim() + "\n", end };
}

function fencesBetween(startHeading, endHeading, language) {
  const start = markdown.indexOf(startHeading);
  const end = markdown.indexOf(endHeading, start + startHeading.length);
  if (start < 0 || end < 0) {
    throw new Error(`Could not find ${startHeading} .. ${endHeading}`);
  }
  const bodies = [];
  let cursor = start;
  while (cursor < end) {
    const found = fence(language, cursor);
    if (!found || found.end > end) break;
    bodies.push(found.body);
    cursor = found.end + 3;
  }
  return bodies;
}

const schema = fence("prisma", markdown.indexOf("## 7. Prisma schema"));
if (!schema) throw new Error("Prisma schema fence not found");

const functions = fencesBetween("### 9.1 Shared functions", "### 9.2 Row checks", "sql");
const checks = fencesBetween("### 9.2 Row checks", "### 9.3 Triggers", "sql");
const triggers = fencesBetween("### 9.3 Triggers", "### 9.4 Privileges", "sql");
const indexes = fencesBetween("## 8. Indexes", "## 9. Constraints", "sql");

const integrity = [
  "-- Integrity migration from Documentation/Database_Design.md §8 and §9.",
  "-- Order: functions, checks, triggers, indexes, generated search columns, notes view, sequences.",
  "-- Rollback drops these triggers, checks, generated columns, indexes, the view, and the sequences.",
  "-- Production rollback restores a backup. It does not edit this schema by hand.",
  "",
  ...functions,
  ...checks,
  ...triggers,
  ...indexes,
].join("\n");

mkdirSync("prisma", { recursive: true });
writeFileSync("prisma/schema.prisma", schema.body);
writeFileSync("prisma/integrity.sql", integrity);
console.log(`schema ${schema.body.length} bytes`);
console.log(`integrity ${integrity.length} bytes`);
console.log(
  `functions ${functions.length} checks ${checks.length} triggers ${triggers.length} index fences ${indexes.length}`,
);
