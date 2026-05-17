import { writeFile } from "node:fs/promises";

await writeFile("dist-pages/.nojekyll", "");
