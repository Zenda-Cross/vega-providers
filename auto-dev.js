#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

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
  server: (msg) => console.log(`${colors.cyan}🌐${colors.reset} ${msg}`),
  watch: (msg) => console.log(`${colors.magenta}👀${colors.reset} ${msg}`),
};

class AutoDev {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
  }

  async checkDependencies() {
    log.info("Checking dependencies...");

    const requiredPackages = ["nodemon", "concurrently", "express", "cors"];
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

    const missing = requiredPackages.filter(
      (pkg) =>
        !packageJson.dependencies?.[pkg] && !packageJson.devDependencies?.[pkg]
    );

    if (missing.length > 0) {
      log.error(`Missing packages: ${missing.join(", ")}`);
      log.info("Installing missing packages...");
      await this.runCommand("npm", ["install", ...missing, "--save-dev"]);
    }

    log.success("All dependencies are installed");
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: "inherit",
        shell: true,
        ...options,
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on("error", reject);
    });
  }
  async initialBuild() {
    log.info("Running initial build...");
    try {
      await this.runCommand("node", ["build-simple.js"]);
      log.success("Initial build completed");
    } catch (error) {
      log.error("Initial build failed:", error.message);
      throw error;
    }
  }

  startWatcher() {
    log.watch("Starting file watcher...");

    const watcher = spawn("npx", ["nodemon"], {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
      env: { ...process.env, NODE_ENV: "development" },
    });

    watcher.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.magenta}[WATCH]${colors.reset} ${output}`);
      }
    });

    watcher.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.yellow}[WATCH]${colors.reset} ${output}`);
      }
    });

    watcher.on("close", (code) => {
      if (!this.isShuttingDown) {
        log.error(`Watcher exited with code ${code}`);
      }
    });

    this.processes.set("watcher", watcher);
    return watcher;
  }

  startDevServer() {
    log.server("Starting development server...");

    const server = spawn("node", ["dev-server.js"], {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    server.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.cyan}[SERVER]${colors.reset} ${output}`);
      }
    });

    server.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${colors.red}[SERVER]${colors.reset} ${output}`);
      }
    });

    server.on("close", (code) => {
      if (!this.isShuttingDown) {
        log.error(`Server exited with code ${code}`);
      }
    });

    this.processes.set("server", server);
    return server;
  }

  setupSignalHandlers() {
    const cleanup = () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log("\n");
      log.info("Shutting down auto-dev environment...");

      for (const [name, process] of this.processes) {
        log.info(`Stopping ${name}...`);
        process.kill("SIGTERM");
      }

      setTimeout(() => {
        log.success("Auto-dev environment stopped");
        process.exit(0);
      }, 1000);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  async start() {
    console.log(`
${colors.bright}🚀 Vega Providers Auto-Development Environment${colors.reset}


${colors.yellow}Press Ctrl+C to stop${colors.reset}
`);

    try {
      // Setup signal handlers
      this.setupSignalHandlers();

      // Check dependencies
      await this.checkDependencies();

      // Initial build
      await this.initialBuild();

      // Start watcher and server
      this.startWatcher();

      // Wait a bit before starting server
      setTimeout(() => {
        this.startDevServer();
      }, 2000);

      log.success("Auto-development environment is running!");
      log.info(
        "Make changes to your providers and watch them rebuild automatically"
      );
    } catch (error) {
      log.error("Failed to start auto-dev environment:", error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const autoDev = new AutoDev();
  autoDev.start();
}

module.exports = AutoDev;
