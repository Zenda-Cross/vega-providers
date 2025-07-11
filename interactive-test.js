const cheerio = require("cheerio");
const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { getBaseUrl } = require("./dist/getBaseUrl.js");

const providerContext = { axios, cheerio, getBaseUrl };

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to prompt user input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Get all available providers and their functions
function getAvailableProviders() {
  const distPath = path.join(__dirname, "dist");
  const providers = {};

  if (!fs.existsSync(distPath)) {
    console.log(
      "❌ Build directory not found. Please run 'npm run build' first."
    );
    return providers;
  }

  const items = fs.readdirSync(distPath, { withFileTypes: true });

  items.forEach((item) => {
    if (item.isDirectory()) {
      const providerPath = path.join(distPath, item.name);
      const files = fs.readdirSync(providerPath);

      providers[item.name] = {};

      files.forEach((file) => {
        if (file.endsWith(".js")) {
          const functionName = file.replace(".js", "");
          try {
            const modulePath = path.join(providerPath, file);
            const module = require(modulePath);

            // Get all exported functions
            const functions = Object.keys(module).filter(
              (key) => typeof module[key] === "function"
            );

            if (functions.length > 0) {
              providers[item.name][functionName] = {
                path: modulePath,
                functions: functions,
                module: module,
              };
            }
          } catch (error) {
            // Skip files that can't be loaded
          }
        }
      });
    }
  });

  // Also check for standalone files
  items.forEach((item) => {
    if (item.isFile() && item.name.endsWith(".js")) {
      const functionName = item.name.replace(".js", "");
      try {
        const modulePath = path.join(distPath, item.name);
        const module = require(modulePath);

        const functions = Object.keys(module).filter(
          (key) => typeof module[key] === "function"
        );

        if (functions.length > 0) {
          if (!providers["standalone"]) providers["standalone"] = {};
          providers["standalone"][functionName] = {
            path: modulePath,
            functions: functions,
            module: module,
          };
        }
      } catch (error) {
        // Skip files that can't be loaded
      }
    }
  });

  return providers;
}

// Display available providers
function displayProviders(providers) {
  console.log("\n🎯 Available Providers:");
  console.log("========================");

  const providerNames = Object.keys(providers);
  providerNames.forEach((provider, index) => {
    const functionCount = Object.keys(providers[provider]).length;
    console.log(`${index + 1}. ${provider} (${functionCount} modules)`);
  });

  return providerNames;
}

// Display functions for a provider
function displayFunctions(provider, providerData) {
  console.log(`\n📋 Available modules in ${provider}:`);
  console.log("======================================");

  const modules = Object.keys(providerData);
  modules.forEach((module, index) => {
    const functions = providerData[module].functions;
    console.log(`${index + 1}. ${module} - Functions: ${functions.join(", ")}`);
  });

  return modules;
}

// Get sample data for different function types
function getSampleData(functionName, moduleName) {
  const samples = {
    // Meta functions
    getMeta: {
      link: "https://example.com/movie-title",
      providerContext,
    },

    // Posts/Search functions
    getPosts: {
      url: "https://example.com/search?q=movie",
      providerContext,
    },
    getSearchPosts: {
      searchQuery: "avengers",
      page: 1,
      providerContext,
      providerValue: moduleName,
    },

    // Episodes functions
    getEpisodes: {
      url: "episode-id-or-url",
      providerContext,
    },

    // Stream functions
    getStream: {
      url: "https://example.com/stream-url",
      providerContext,
    },

    // Catalog functions
    getCatalog: {
      type: "movie",
      genre: "action",
      providerContext,
    },
  };

  return samples[functionName] || {};
}

// Execute the selected function
async function executeFunction(module, functionName, params) {
  try {
    console.log(`\n⚡ Executing ${functionName}...`);
    console.log("📝 Parameters:", JSON.stringify(params, null, 2));
    console.log("⏳ Please wait...\n");

    const startTime = Date.now();
    const result = await module[functionName](params);
    const endTime = Date.now();

    console.log("✅ Success!");
    console.log(`⏱️  Execution time: ${endTime - startTime}ms`);
    console.log("📊 Result:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(50));
  } catch (error) {
    console.log("❌ Error occurred:");
    console.log("🔍 Error details:", error.message);
    if (error.stack) {
      console.log("📚 Stack trace:", error.stack);
    }
  }
}

// Allow user to customize parameters
async function customizeParameters(sampleParams, functionName) {
  console.log(`\n🔧 Customize parameters for ${functionName}:`);
  console.log("Current parameters:", JSON.stringify(sampleParams, null, 2));

  const useCustom = await prompt(
    "\nDo you want to customize parameters? (y/n): "
  );

  if (useCustom.toLowerCase() === "y" || useCustom.toLowerCase() === "yes") {
    const customParams = { ...sampleParams };

    for (const [key, value] of Object.entries(sampleParams)) {
      if (key !== "providerContext") {
        const newValue = await prompt(
          `${key} (current: ${JSON.stringify(value)}): `
        );
        if (newValue) {
          // Try to parse as JSON, otherwise use as string
          try {
            customParams[key] = JSON.parse(newValue);
          } catch {
            customParams[key] = newValue;
          }
        }
      }
    }

    return customParams;
  }

  return sampleParams;
}

// Main interactive loop
async function main() {
  console.log("🚀 Vega Providers Interactive Tester");
  console.log("=====================================");

  const providers = getAvailableProviders();

  if (Object.keys(providers).length === 0) {
    console.log(
      "❌ No providers found. Make sure to build the project first with 'npm run build'"
    );
    rl.close();
    return;
  }

  while (true) {
    try {
      // Select provider
      const providerNames = displayProviders(providers);
      const providerChoice = await prompt(
        `\nSelect a provider (1-${providerNames.length}) or 'q' to quit: `
      );

      if (providerChoice.toLowerCase() === "q") {
        console.log("👋 Goodbye!");
        break;
      }

      const providerIndex = parseInt(providerChoice) - 1;
      if (providerIndex < 0 || providerIndex >= providerNames.length) {
        console.log("❌ Invalid choice. Please try again.");
        continue;
      }

      const selectedProvider = providerNames[providerIndex];
      const providerData = providers[selectedProvider];

      // Select module
      const modules = displayFunctions(selectedProvider, providerData);
      const moduleChoice = await prompt(
        `\nSelect a module (1-${modules.length}): `
      );

      const moduleIndex = parseInt(moduleChoice) - 1;
      if (moduleIndex < 0 || moduleIndex >= modules.length) {
        console.log("❌ Invalid choice. Please try again.");
        continue;
      }

      const selectedModule = modules[moduleIndex];
      const moduleData = providerData[selectedModule];

      // Select function
      console.log(`\n🔧 Available functions in ${selectedModule}:`);
      moduleData.functions.forEach((func, index) => {
        console.log(`${index + 1}. ${func}`);
      });

      const functionChoice = await prompt(
        `\nSelect a function (1-${moduleData.functions.length}): `
      );

      const functionIndex = parseInt(functionChoice) - 1;
      if (functionIndex < 0 || functionIndex >= moduleData.functions.length) {
        console.log("❌ Invalid choice. Please try again.");
        continue;
      }

      const selectedFunction = moduleData.functions[functionIndex];

      // Get and customize parameters
      const sampleParams = getSampleData(selectedFunction, selectedProvider);
      const finalParams = await customizeParameters(
        sampleParams,
        selectedFunction
      );

      // Execute function
      await executeFunction(moduleData.module, selectedFunction, finalParams);

      // Ask if user wants to continue
      const continueChoice = await prompt(
        "\n🔄 Test another function? (y/n): "
      );
      if (
        continueChoice.toLowerCase() !== "y" &&
        continueChoice.toLowerCase() !== "yes"
      ) {
        console.log("👋 Goodbye!");
        break;
      }
    } catch (error) {
      console.log("❌ An unexpected error occurred:", error.message);
      const retryChoice = await prompt("🔄 Try again? (y/n): ");
      if (
        retryChoice.toLowerCase() !== "y" &&
        retryChoice.toLowerCase() !== "yes"
      ) {
        break;
      }
    }
  }

  rl.close();
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n👋 Goodbye!");
  rl.close();
  process.exit(0);
});

// Start the interactive tester
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  rl.close();
  process.exit(1);
});
