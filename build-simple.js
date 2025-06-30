const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Build configuration
const PROVIDERS_DIR = "./providers";
const DIST_DIR = "./dist";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  build: (msg) => console.log(`${colors.magenta}🔨${colors.reset} ${msg}`),
  file: (msg) => console.log(`${colors.cyan}📄${colors.reset} ${msg}`),
};

/**
 * Simple and efficient provider builder
 */
class ProviderBuilder {
  constructor() {
    this.startTime = Date.now();
    this.providers = [];
    this.manifest = [];
  }

  /**
   * Clean the dist directory
   */
  cleanDist() {
    if (fs.existsSync(DIST_DIR)) {
      fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });
    // log.success("Cleaned dist directory");
  }

  /**
   * Discover all provider directories
   */
  discoverProviders() {
    const items = fs.readdirSync(PROVIDERS_DIR, { withFileTypes: true });

    this.providers = items
      .filter((item) => item.isDirectory())
      .filter((item) => !item.name.startsWith("."))
      .map((item) => item.name);

    log.info(
      `Found ${this.providers.length} providers: ${this.providers.join(", ")}`
    );
  }

  /**
   * Compile all TypeScript files using tsconfig.json
   */
  compileAllProviders() {
    log.build("Compiling TypeScript files...");

    try {
      // Use TypeScript to compile all files according to tsconfig.json
      execSync("npx tsc", {
        stdio: "pipe",
        encoding: "utf8",
      });

      // log.success("TypeScript compilation completed");
      return true;
    } catch (error) {
      log.error("TypeScript compilation failed:");
      if (error.stdout) {
        console.log(error.stdout);
      }
      if (error.stderr) {
        console.log(error.stderr);
      }
      return false;
    }
  }

  /**
   * Organize compiled files by provider
   */
  organizeFiles() {
    log.build("Organizing compiled files...");

    for (const provider of this.providers) {
      const providerSrcDir = path.join(PROVIDERS_DIR, provider);
      const providerDistDir = path.join(DIST_DIR, provider);

      // Create provider dist directory
      if (!fs.existsSync(providerDistDir)) {
        fs.mkdirSync(providerDistDir, { recursive: true });
      }

      // Copy compiled JS files
      const files = [
        "catalog.js",
        "posts.js",
        "meta.js",
        "stream.js",
        "episodes.js",
      ];
      let fileCount = 0;

      for (const file of files) {
        const srcFile = path.join(DIST_DIR, provider, file);
        const destFile = path.join(providerDistDir, file);

        if (fs.existsSync(srcFile)) {
          // File already in the right place
          fileCount++;
        }
      }

      if (fileCount > 0) {
        // log.success(`  ${provider}: ${fileCount} modules ready`);
      } else {
        log.warning(`  ${provider}: No modules found`);
      }
    }
  }

  /**
   * Build everything
   */
  build() {
    const isWatchMode = process.env.NODE_ENV === "development";

    if (isWatchMode) {
      console.log(
        `\n${colors.cyan}🔄 Auto-build triggered${
          colors.reset
        } ${new Date().toLocaleTimeString()}`
      );
    } else {
      console.log(
        `\n${colors.bright}🚀 Starting provider build...${colors.reset}\n`
      );
    }

    this.cleanDist();
    this.discoverProviders();

    const compiled = this.compileAllProviders();
    if (!compiled) {
      log.error("Build failed due to compilation errors");
      process.exit(1);
    }

    this.organizeFiles();

    const buildTime = Date.now() - this.startTime;
    log.success(`Build completed in ${buildTime}ms`);

    if (isWatchMode) {
      console.log(`${colors.green}👀 Watching for changes...${colors.reset}\n`);
    } else {
      console.log(
        `${colors.bright}✨ Build completed successfully!${colors.reset}\n`
      );
    }
  }
}

// Run the build
const builder = new ProviderBuilder();
builder.build();
