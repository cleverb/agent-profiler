import { rm } from "node:fs/promises";

await rm("dist-pages", { recursive: true, force: true });
