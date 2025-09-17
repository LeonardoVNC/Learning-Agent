export default {
  "client/**/*.{ts,tsx,js,jsx}": [
    "npm --prefix backend run lint"
  ],
  "src/**/*.spec.ts": [  // <- Add this section for tests
    "jest --bail --passWithNoTests"
  ]
};