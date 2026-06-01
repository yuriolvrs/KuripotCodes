import { promises as fs } from "node:fs";
import path from "node:path";
import { mergePromos } from "./normalize";
import type { Promo } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROMOS_FILE = path.join(DATA_DIR, "promos.json");

export async function loadPromos(): Promise<Promo[]> {
  try {
    const contents = await fs.readFile(PROMOS_FILE, "utf8");
    const parsed = JSON.parse(contents) as Promo[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function savePromos(promos: Promo[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROMOS_FILE, `${JSON.stringify(promos, null, 2)}\n`, "utf8");
}

export async function upsertPromo(promo: Promo) {
  const current = await loadPromos();
  const next = mergePromos(current, [promo]);
  await savePromos(next);
  return promo;
}

export async function getActivePromos() {
  const promos = await loadPromos();
  return promos.filter((promo) => promo.status === "active");
}
