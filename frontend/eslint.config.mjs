import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    rules: {
      "@next/next/no-page-custom-font": "off"
    }
  },
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      "out/**"
    ]
  }
];

export default config;
