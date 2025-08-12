/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vite";
import dts from "unplugin-dts/vite"
import packageJson from "./package.json";

const getPackageName = () => {
  return packageJson.name;
};

const getPackageNameCamelCase = () => {
  try {
    return getPackageName().replace(/-./g, char => char[1].toUpperCase());
  } catch {
    throw new Error("Name property in package.json is missing.");
  }
};

const fileName = {
  es: `index.js`,
  cjs: `index.cjs`,
  iife: `index.iife.js`,
};

const formats = Object.keys(fileName) as Array<keyof typeof fileName>;

export default defineConfig({
  base: "./",
  build: {
    outDir: "./dist",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: getPackageNameCamelCase(),
      formats,
      fileName: format => fileName[format],
    },
    /*rollupOptions: {
        external: ["vue"],
        output: {
            globals: {
                vue: 'Vue'
            }
        }
    }*/
  },
  test: {
    watch: false,
  },
  resolve: {
    alias: {
        '@': path.resolve(import.meta.dirname, 'src')
    },
  },
  plugins: [dts({ bundleTypes: true })]
});