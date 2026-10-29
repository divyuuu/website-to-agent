import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "data/**"] },
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended
);
