import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/browser/main.ts",
  output: {
    file: "dist/app.iife.js",
    format: "iife",
    sourcemap: true,
    strict: true,
  },
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: "./tsconfig.json",
      noEmitOnError: true,
    }),
  ],
};
