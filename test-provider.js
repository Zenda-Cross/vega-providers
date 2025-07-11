const readline = require("readline");
const cheerio = require("cheerio");
const axios = require("axios");
const { z } = require("zod");
const { getBaseUrl } = require("./dist/getBaseUrl.js");
const { hubcloudExtracter } = require("./dist/hubcloudExtractor.js");
const { gofileExtracter } = require("./dist/gofileExtracter.js");
const { superVideoExtractor } = require("./dist/superVideoExtractor.js");
const { gdFlixExtracter } = require("./dist/gdFlixExtractor.js");

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

// Mock providerContext (predefined - user doesn't need to provide this)
const providerContext = {
  axios,
  cheerio,
  getBaseUrl,
  commonHeaders: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  extractors: {
    hubcloudExtracter: hubcloudExtracter,
    gofileExtracter: gofileExtracter,
    superVideoExtractor: superVideoExtractor,
    gdFlixExtracter: gdFlixExtracter,
  },
  Crypto: {},
};

// Function parameter definitions based on README and types
const functionParams = {
  // Posts functions
  getPosts: {
    required: ["filter", "page"],
    optional: ["signal"],
    defaults: {
      page: 1,
      filter: "",
      providerValue: "", // Will be set to provider name
      signal: new AbortController().signal,
      providerContext,
    },
    prompts: {
      filter: "Enter filter (e.g., '/category/popular' or '' for latest): ",
      page: "Enter page number (default: 1): ",
    },
  },

  getSearchPosts: {
    required: ["searchQuery", "page"],
    optional: ["signal"],
    defaults: {
      page: 1,
      providerValue: "", // Will be set to provider name
      signal: new AbortController().signal,
      providerContext,
    },
    prompts: {
      searchQuery: "Enter search query: ",
      page: "Enter page number (default: 1): ",
    },
  },

  // Meta function
  getMeta: {
    required: ["link"],
    optional: [],
    defaults: {
      providerContext,
    },
    prompts: {
      link: "Enter movie/show URL: ",
    },
  },

  // Episodes function
  getEpisodes: {
    required: ["url"],
    optional: [],
    defaults: {
      providerContext,
    },
    prompts: {
      url: "Enter episode/season URL or ID: ",
    },
  },

  // Stream function
  getStream: {
    required: ["link", "type"],
    optional: ["signal"],
    defaults: {
      type: "movie",
      signal: new AbortController().signal,
      providerContext,
    },
    prompts: {
      link: "Enter stream link/URL: ",
      type: "Enter type (movie/series) [default: movie]: ",
    },
  },
};

// Sample values for quick testing
const sampleValues = {
  getPosts: {
    filter: "",
    page: "1",
  },
  getSearchPosts: {
    searchQuery: "avengers",
    page: "1",
  },
  getMeta: {
    link: "https://example.com/movie-title",
  },
  getEpisodes: {
    url: "season-1-url-or-id",
  },
  getStream: {
    link: "https://example.com/stream-url",
    type: "movie",
  },
};

async function getParameters(functionName, providerName) {
  const paramDef = functionParams[functionName];
  if (!paramDef) {
    throw new Error(`Unknown function: ${functionName}`);
  }

  const params = { ...paramDef.defaults };

  // Set providerValue to the provider name for functions that need it
  if (params.hasOwnProperty("providerValue")) {
    params.providerValue = providerName;
  }

  console.log(`\n📝 Enter parameters for ${functionName}:`);
  console.log(`💡 Press Enter to use sample values`);

  // Get required parameters
  for (const paramName of paramDef.required) {
    const promptText = paramDef.prompts[paramName];
    const sampleValue = sampleValues[functionName]?.[paramName] || "";

    let value = await prompt(
      `${promptText}${sampleValue ? `[sample: ${sampleValue}] ` : ""}`
    );

    if (!value && sampleValue) {
      value = sampleValue;
      console.log(`Using sample value: ${sampleValue}`);
    }

    if (!value && paramDef.required.includes(paramName)) {
      console.log(`❌ ${paramName} is required!`);
      process.exit(1);
    }

    // Type conversion
    if (paramName === "page") {
      params[paramName] = parseInt(value) || 1;
    } else {
      params[paramName] = value;
    }
  }

  return params;
}

async function testProvider(providerName, functionName) {
  try {
    console.log(`\n🧪 Testing ${providerName} - ${functionName}`);
    console.log("=".repeat(50));

    // Check if provider exists
    const modulePath = `./dist/${providerName}`;
    let module;

    try {
      // For posts, we need to check which file has the function
      if (functionName === "getPosts" || functionName === "getSearchPosts") {
        module = require(`${modulePath}/posts.js`);
      } else if (functionName === "getMeta") {
        module = require(`${modulePath}/meta.js`);
      } else if (functionName === "getEpisodes") {
        module = require(`${modulePath}/episodes.js`);
      } else if (functionName === "getStream") {
        module = require(`${modulePath}/stream.js`);
      } else {
        throw new Error(`Unknown function: ${functionName}`);
      }
    } catch (error) {
      console.log(
        `❌ Provider '${providerName}' not found or built. Make sure to run 'npm run build' first.`
      );
      console.log(`Error: ${error.message}`);
      return;
    }

    // Check if function exists
    if (!module[functionName]) {
      console.log(`❌ Function '${functionName}' not found in ${providerName}`);
      const availableFunctions = Object.keys(module).filter(
        (key) => typeof module[key] === "function"
      );
      console.log(`Available functions: ${availableFunctions.join(", ")}`);
      return;
    }

    // Get parameters
    const params = await getParameters(functionName, providerName);

    console.log("\n📋 Final parameters:");
    console.log(JSON.stringify(params, null, 2));

    // Execute function
    console.log("\n⏳ Executing...");
    const startTime = Date.now();

    const result = await module[functionName](params);
    const endTime = Date.now();

    console.log(`\n✅ Success! (${endTime - startTime}ms)`);
    console.log("📊 Result:");
    console.log("-".repeat(60));
    console.log(JSON.stringify(result, null, 2));
    console.log("-".repeat(60));

    // Validate response
    console.log("\n🔍 Response Validation:");
    const validationResult = validateResponse(functionName, result);
    console.log(validationResult.message);

    if (!validationResult.isValid) {
      console.log(
        "\n💡 Tip: Check your provider implementation to ensure it returns the correct format."
      );
    }
  } catch (error) {
    console.log(`\n❌ Error testing ${providerName}/${functionName}:`);
    console.log("🔍 Error:", error.message);
    if (error.stack) {
      console.log("📚 Stack:", error.stack);
    }
  }
}

// Zod schemas for response validation
const PostSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  link: z.string().url("Link must be a valid URL"),
  image: z.string().url("Image must be a valid URL"),
  provider: z.string().optional(),
});

const StreamSchema = z.object({
  server: z.string().min(1, "Server name cannot be empty"),
  link: z.string().url("Stream link must be a valid URL"),
  type: z.string().min(1, "Type cannot be empty"),
  quality: z.enum(["360", "480", "720", "1080", "2160"]).optional(),
  subtitles: z
    .array(
      z.object({
        title: z.string(),
        language: z.string(),
        type: z.string(),
        uri: z.string().url(),
      })
    )
    .optional(),
  headers: z.any().optional(),
});

const LinkSchema = z.object({
  title: z.string().min(1, "Link title cannot be empty"),
  quality: z.string().optional(),
  episodesLink: z.string().optional(),
  directLinks: z
    .array(
      z.object({
        title: z.string().min(1, "Direct link title cannot be empty"),
        link: z.string().url("Direct link must be a valid URL"),
        type: z.enum(["movie", "series"]).optional(),
      })
    )
    .optional(),
});

const InfoSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  image: z.string().url("Image must be a valid URL"),
  synopsis: z.string(),
  imdbId: z.string(),
  type: z.string().min(1, "Type cannot be empty"),
  tags: z.array(z.string()).optional(),
  cast: z.array(z.string()).optional(),
  rating: z.string().optional(),
  linkList: z.array(LinkSchema),
});

const EpisodeLinkSchema = z.object({
  title: z.string().min(1, "Episode title cannot be empty"),
  link: z.string().min(1, "Episode link cannot be empty"),
});

// Response schemas for each function
const responseSchemas = {
  getPosts: z.array(PostSchema),
  getSearchPosts: z.array(PostSchema),
  getMeta: InfoSchema,
  getEpisodes: z.array(EpisodeLinkSchema),
  getStream: z.array(StreamSchema),
};

function validateResponse(functionName, result) {
  const schema = responseSchemas[functionName];
  if (!schema) {
    return { isValid: true, message: "No validation schema found" };
  }

  try {
    schema.parse(result);

    // Additional checks for array responses
    if (Array.isArray(result)) {
      const itemCount = result.length;
      return {
        isValid: true,
        message: `✅ Validation Success: Response matches expected ${functionName} format (${itemCount} items)`,
      };
    } else {
      return {
        isValid: true,
        message: `✅ Validation Success: Response matches expected ${functionName} format`,
      };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        let message = issue.message;
        let location = "";

        if (issue.path.length > 0) {
          const path = issue.path.join(".");
          // Check if it's an array item
          if (issue.path.some((p) => typeof p === "number")) {
            const arrayIndex = issue.path.find((p) => typeof p === "number");
            const fieldPath = issue.path
              .slice(issue.path.indexOf(arrayIndex) + 1)
              .join(".");
            location = ` in item ${arrayIndex}${
              fieldPath ? ` (field: ${fieldPath})` : ""
            }`;
          } else {
            location = ` at field: ${path}`;
          }
        }

        return `${message}${location}`;
      });

      return {
        isValid: false,
        message: `❌ Validation Failed:\n${issues
          .map((issue) => `  • ${issue}`)
          .join("\n")}`,
      };
    }
    return {
      isValid: false,
      message: `❌ Validation Error: ${error.message}`,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Check for rebuild flag
  const rebuildIndex = args.indexOf("--rebuild");
  const shouldRebuild = rebuildIndex !== -1;

  // Remove rebuild flag from args
  if (shouldRebuild) {
    args.splice(rebuildIndex, 1);
  }

  if (args.length === 0) {
    console.log("🎯 Vega Providers Command Line Tester");
    console.log("====================================");
    console.log("\nUsage:");
    console.log("  node test-provider.js <provider> <function> [--rebuild]");
    console.log("\nExamples:");
    console.log("  node test-provider.js mod getPosts");
    console.log("  node test-provider.js mod getSearchPosts --rebuild");
    console.log("  node test-provider.js uhd getMeta");
    console.log("  node test-provider.js primeMirror getEpisodes");
    console.log("  node test-provider.js luxMovies getStream");
    console.log("\nAvailable functions:");
    console.log("  - getPosts       (get posts by filter/category)");
    console.log("  - getSearchPosts (search for posts)");
    console.log("  - getMeta        (get metadata for a movie/show)");
    console.log("  - getEpisodes    (get episodes for a season)");
    console.log("  - getStream      (get streaming links)");
    console.log("\nFlags:");
    console.log("  --rebuild        Rebuild TypeScript files before testing");
    console.log(
      "\nNote: Run with --rebuild flag if you've made changes to TypeScript files!"
    );
    rl.close();
    return;
  }

  if (args.length < 2) {
    console.log("❌ Please provide both provider name and function name");
    console.log(
      "Usage: node test-provider.js <provider> <function> [--rebuild]"
    );
    rl.close();
    return;
  }

  const providerName = args[0];
  const functionName = args[1];

  // Validate function name
  const validFunctions = [
    "getPosts",
    "getSearchPosts",
    "getMeta",
    "getEpisodes",
    "getStream",
  ];
  if (!validFunctions.includes(functionName)) {
    console.log(`❌ Invalid function name: ${functionName}`);
    console.log(`Valid functions: ${validFunctions.join(", ")}`);
    rl.close();
    return;
  }

  // Rebuild if requested
  if (shouldRebuild) {
    console.log("🔨 Rebuilding TypeScript files...");
    const { spawn } = require("child_process");

    try {
      const buildProcess = spawn("npm", ["run", "build"], {
        stdio: "inherit",
        shell: true,
      });

      await new Promise((resolve, reject) => {
        buildProcess.on("close", (code) => {
          if (code === 0) {
            console.log("✅ Build completed successfully!");
            resolve();
          } else {
            console.log("❌ Build failed!");
            reject(new Error(`Build process exited with code ${code}`));
          }
        });

        buildProcess.on("error", (error) => {
          console.log("❌ Build error:", error.message);
          reject(error);
        });
      });
    } catch (error) {
      console.log("❌ Failed to rebuild. Please run 'npm run build' manually.");
      rl.close();
      return;
    }
  }

  await testProvider(providerName, functionName);
  rl.close();
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n👋 Test cancelled!");
  rl.close();
  process.exit(0);
});

// Start the tester
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  rl.close();
  process.exit(1);
});
