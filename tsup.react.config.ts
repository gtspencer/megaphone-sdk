import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/react/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outDir: "dist/react",
  tsconfig: "tsconfig.react.json",
  loader: {
    ".svg": "text"
  },
  publicDir: "src/react/assets",
  clean: false
});

