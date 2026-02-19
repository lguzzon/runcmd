import js from "@eslint/js"
import {defineConfig} from "eslint/config"
import astro from "eslint-plugin-astro"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  {ignores: ["dist", ".astro", "../public"]},
  astro.configs["flat/recommended"],
  {
    files: ["**/*.{ts,js,mjs}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      sourceType: "module"
    }
  }
])
