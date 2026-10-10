/**
 * The folder holding the package's data files (CSV, GeoJSON, lagesbild JSON). Every loader
 * reads through this one value. BOSTAD_DATA_DIR wins when set (the container sets it to
 * /app/data, where the Dockerfile copies the folder); otherwise the package's own data folder
 * is found from the source or dist location, or by walking up from the working directory.
 */
import * as fs from "fs";
import * as path from "path";

function packageDataDir(): string {
  if (typeof __dirname !== "undefined") return path.resolve(__dirname, "..", "..", "data");
  let dir = path.resolve(process.cwd());
  for (;;) {
    const candidate = path.join(dir, "packages", "bostad", "data");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(process.cwd(), "..", "..", "data");
    dir = parent;
  }
}

const fromEnv = process.env.BOSTAD_DATA_DIR;
export const DATA_DIR: string = fromEnv && fromEnv.trim() !== "" ? fromEnv : packageDataDir();
