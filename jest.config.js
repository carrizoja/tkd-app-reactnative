/**
 * Three Jest projects:
 *  - "app":   React Native / data-layer unit tests via the jest-expo preset.
 *  - "rules": Firestore Security Rules tests in a Node environment, run against
 *             the Firebase emulator (see `npm run test:rules`).
 *  - "auth":  Firebase Auth + Firestore data-layer tests in a Node environment,
 *             run against the Auth and Firestore emulators (see
 *             `npm run test:auth`). Kept out of the "app" project so they never
 *             run without the emulators up.
 *
 * The Node projects bypass `babel.config.js` on purpose: `babel-preset-expo`
 * rewrites `process.env` into an ESM `expo/virtual/env` import (unparseable in
 * a plain Node environment) and inlines `EXPO_PUBLIC_*` values at transform
 * time, which would freeze the emulator settings that `auth-tests/setup.ts`
 * sets at runtime. Stripping types and converting modules is all they need.
 */
const nodeTransform = {
  "^.+\\.tsx?$": [
    "babel-jest",
    {
      babelrc: false,
      configFile: false,
      presets: ["@babel/preset-typescript"],
      plugins: ["@babel/plugin-transform-modules-commonjs"],
    },
  ],
};

module.exports = {
  projects: [
    {
      displayName: "app",
      preset: "jest-expo",
      testMatch: [
        "<rootDir>/src/**/*.test.{ts,tsx}",
        "<rootDir>/__tests__/**/*.test.{ts,tsx}",
      ],
    },
    {
      displayName: "rules",
      testEnvironment: "node",
      testMatch: ["<rootDir>/firestore-tests/**/*.test.ts"],
      transform: nodeTransform,
    },
    {
      displayName: "auth",
      testEnvironment: "node",
      testMatch: ["<rootDir>/auth-tests/**/*.test.ts"],
      setupFiles: ["<rootDir>/auth-tests/setup.ts"],
      transform: nodeTransform,
    },
  ],
};
