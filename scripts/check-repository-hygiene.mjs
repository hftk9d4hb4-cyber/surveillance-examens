import { existsSync, readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { spawnSync } from "node:child_process";

const git = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
if (git.status !== 0) {
  console.error(git.stderr || "Impossible de lire la liste des fichiers suivis.");
  process.exit(1);
}

const files = git.stdout.split("\0").filter(Boolean);
const errors = [];
const allowedRootTypeScript = new Set([
  "middleware.ts",
  "next-env.d.ts",
  "next.config.ts"
]);

for (const file of files) {
  const name = basename(file);
  const extension = extname(file);

  if (/^download(?: \(\d+\))?$/i.test(name)) {
    errors.push(`${file}: fichier de téléchargement parasite`);
  }
  if (/ \(\d+\)(?:\.[^/]+)?$/.test(name)) {
    errors.push(`${file}: suffixe de copie suspect`);
  }
  if (file === "tsconfig.tsbuildinfo" || file.endsWith(".tsbuildinfo")) {
    errors.push(`${file}: artefact de compilation suivi par Git`);
  }
  if (!file.includes("/") && [".ts", ".tsx"].includes(extension) && !allowedRootTypeScript.has(file)) {
    errors.push(`${file}: source applicative inattendue à la racine`);
  }
  if (!file.includes("/") && extension === ".md" && file !== "README.md") {
    errors.push(`${file}: documentation attendue dans docs/`);
  }
  if (!file.includes("/") && [".sql", ".xlsx", ".xls", ".csv"].includes(extension)) {
    errors.push(`${file}: donnée ou migration inattendue à la racine`);
  }
}

if (!existsSync("package-lock.json")) {
  errors.push("package-lock.json: verrou npm absent");
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const versionSource = readFileSync("lib/version.ts", "utf8");
const appVersion = versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1];
if (!appVersion || appVersion !== packageJson.version) {
  errors.push(`Versions incohérentes: package.json=${packageJson.version}, APP_VERSION=${appVersion ?? "absente"}`);
}

if (errors.length > 0) {
  console.error("Contrôle d’hygiène du dépôt en échec :");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Hygiène du dépôt validée (${files.length} fichiers suivis).`);
