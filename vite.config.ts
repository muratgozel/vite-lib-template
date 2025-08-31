/// <reference types="vitest" />
import path from "path";
import { defineConfig, type LibraryFormats } from "vite";
import dts from "unplugin-dts/vite"
import camelCase from "camelcase"
import packageJson from "./package.json";
import dtsToCjs from "./plugins/dts-to-cjs";

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

const generateFileName = (format: string, entryName: string) => {
  let ext = 'js'
  if (format == 'cjs') ext = 'cjs'
  if (format == 'iife') ext = 'iife.js'
  return `${entryName}.${ext}`
}

const entries = [
  path.resolve(__dirname, "src/index.ts"),
  path.resolve(__dirname, "src/alt.ts")
]
const formats = (entries.length > 0 ? ['es', 'cjs'] : ['es', 'cjs', 'iife']) as LibraryFormats[];

export default defineConfig({
  base: "./",
  build: {
    outDir: "./dist",
    lib: {
      entry: entries,
      name: getPackageNameCamelCase(),
      formats,
      fileName: generateFileName
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
  plugins: [
    dts({ bundleTypes: true }),
    dtsToCjs({
      outDir: 'dist', // Should match your DTS plugin outDir
      pattern: '**/*.d.ts', // Optional: customize which files to convert
      // Optional: custom namespace name generator
      getNamespaceName: (fileName) => {
        //const baseName = path.basename(fileName, '.d.ts');
        const _name = packageJson.name.split('/').reverse()[0]
        return camelCase(_name)
      }
    })
  ]
});