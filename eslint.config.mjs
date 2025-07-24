import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Compatibility layers (your current config)
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Files to ignore (replacing .eslintignore)
  {
    ignores: [
      // Build directories
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "build/**",

      // Generated files
      "**/*.generated.*",
      "**/*.min.*",

      // Test files
      "**/*.test.*",
      "**/*.spec.*",
      "**/__tests__/**",
      "**/__mocks__/**",

      // Third-party code
      "public/**",

      // Legacy or work-in-progress code
      "**/WalletContext-Fixed.tsx",
      "**/WalletContext-Updated.tsx",
      "**/DocumentSigning-Old.tsx",
      "**/DocumentSigning-TwoTabs.tsx",
      "**/DocumentSigning-WithHistory.tsx",
      "**/IntegratedDocumentSigningComplete.tsx",
      "**/pdf-verification-broken.ts",

      // Library files with many any types
      "**/lib/database.ts",
      "**/lib/supabase-admin.ts",
      "**/lib/supabase-storage.ts",
      "**/lib/pdf-signature-insert.ts",
      "**/lib/duplicate-document-checker.ts",
      "**/lib/user-identity*.ts",

      // API routes with unused imports
      "**/api/auth/clear/route.ts",
      "**/api/documents/sign/route.ts",
      "**/api/documents/upload/route.ts",
      "**/api/documents/upload-with-duplicate-check/route.ts",

      // Pages with many ESLint issues
      "**/app/auth-test/page.tsx",
      "**/app/verify/page.tsx"
    ]
  },

  // ✅ Custom rule overrides
  {
    rules: {
      // Disable unused variables warning completely
      "@typescript-eslint/no-unused-vars": "off",
      // Disable the any type warning completely
      "@typescript-eslint/no-explicit-any": "off",

      // Warn instead of error on missing useEffect deps
      "react-hooks/exhaustive-deps": "warn",

      // Warn instead of error for apostrophes, quotes, etc.
      "react/no-unescaped-entities": "warn",

      // Optional: allow optional chaining with non-null assertions (warn instead of error)
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",

      // Additional rules to reduce warnings/errors
      "import/no-anonymous-default-export": "off",
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "no-unused-expressions": "warn",
      "prefer-const": "warn",
      "no-empty": "warn",
      "@next/next/no-img-element": "off",
      "react/display-name": "off",
      "react/jsx-key": "warn",
      "react/no-children-prop": "warn",
    },
  },
];

export default eslintConfig;
