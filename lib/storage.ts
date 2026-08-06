import { promises as fs } from "node:fs";
import path from "node:path";
import { mergePromos } from "./normalize";
import type { Promo } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROMOS_FILE = path.join(DATA_DIR, "promos.json");

let writeLock: Promise<unknown> = Promise.resolve();

// Flat-file storage has no transactions, so concurrent read-modify-write
// cycles (e.g. two PATCH requests for different promos landing close
// together) can race and silently drop one write. Chaining every
// read-modify-write cycle onto this lock serializes them within the process.
export function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeLock.then(fn, fn);
  writeLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

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
  return withStorageLock(async () => {
    const current = await loadPromos();
    const next = mergePromos(current, [promo]);
    await savePromos(next);
    return promo;
  });
}

export async function getActivePromos() {
  const promos = await loadPromos();
  return promos.filter((promo) => promo.status === "active");
}
