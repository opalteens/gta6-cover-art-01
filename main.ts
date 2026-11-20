// Vice Cover Lab entrypoint (Node 22, standard library only): hands the app in.
// It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with the kit's vendored make.fun library, after checking
// the gate's caps first so a bad build fails loudly here, not on the server.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const shots = readdirSync(join(here, "screenshots")).filter((n) => !n.startsWith("."));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots: need 3 or 4 files, found ${shots.length}`);
}
for (const name of shots) {
  const size = statSync(join(here, "screenshots", name)).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over 256 KiB`);
}
if (!existsSync(join(here, "app", "index.html"))) {
  throw new Error("app/index.html is missing");
}
mkdirSync(out, { recursive: true });
cpSync(join(here, "app"), join(out, "app"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
cpSync(join(here, "screenshots"), join(out, "screenshots"), { recursive: true });
writeFileSync(
  join(out, "dossier.json"),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
const dossierBytes = statSync(join(out, "dossier.json")).size;
console.log(`Vice Cover Lab: wrote ${shots.length} screenshots and a ${dossierBytes} byte dossier to ${out}`);
