const { defineConfig } = require("cypress");
const createBundler = require("@bahmutov/cypress-esbuild-preprocessor");
const { addCucumberPreprocessorPlugin } = require("@badeball/cypress-cucumber-preprocessor");
const { createEsbuildPlugin } = require("@badeball/cypress-cucumber-preprocessor/esbuild");

module.exports = defineConfig({
  e2e: {
    specPattern: "tests/features/*.feature",
    supportFile: "cypress/support/e2e.js",
    // Testes E2E rodam contra o backend/banco real (Supabase); pequenas latencias
    // de rede e consistencia podem causar flakiness. Retries reexecutam o cenario
    // automaticamente, mantendo a suite confiavel sem mascarar bugs reais.
    retries: { runMode: 2, openMode: 0 },
    defaultCommandTimeout: 8000,
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on("file:preprocessor", createBundler({
        plugins: [createEsbuildPlugin(config)],
      }));
      return config;
    },
  },
});