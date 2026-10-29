import { writeFileSync } from "node:fs";
import { inspectPage } from "./inspect.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const url = arg("--url") ?? "http://localhost:4100/";
const out = arg("--out");

inspectPage(url)
  .then((result) => {
    const json = JSON.stringify(result, null, 2);
    if (out) {
      writeFileSync(out, json);
      console.log(`Wrote inspection to ${out}`);
    } else {
      console.log(json);
    }
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
