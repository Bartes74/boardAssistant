#!/usr/bin/env node

import process from "node:process";

const requiredMajor = 20;
const requiredMinor = 0;

const [major, minor] = process.version
  .replace(/^v/, "")
  .split(".")
  .map((part) => parseInt(part, 10));

const isSupported =
  Number.isInteger(major) &&
  Number.isInteger(minor) &&
  (major > requiredMajor || (major === requiredMajor && minor >= requiredMinor));

if (!isSupported) {
  console.error(
    `❌ Wymagana wersja Node.js to >=${requiredMajor}.${requiredMinor}.x, wykryto ${process.version}. Zainstaluj odpowiednią wersję przed kontynuacją.`
  );
  process.exit(1);
}

console.log(`✅ Wersja Node.js ${process.version} spełnia wymagania (>=${requiredMajor}.${requiredMinor}.x).`);
