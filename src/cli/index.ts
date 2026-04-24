// src/cli/index.ts
import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import { collectPrompts } from "./prompts";
import { ProjectGenerator } from "../generators/project.generator";
import { UserConfig } from "../config/feature.matrix";

const program = new Command();

export async function run() {
  console.log(
    chalk.cyan(
      figlet.textSync("User Service Gen", { horizontalLayout: "full" }),
    ),
  );

  console.log(
    chalk.yellow("🚀 Welcome to the Ultimate NestJS User Service Generator!\n"),
  );

  program
    .name("user-service-generator")
    .description("Generate a production-ready NestJS user service")
    .version("1.0.0");

  program
    .command("init [project-name]")
    .description("Initialize a new user service project")
    .action(async (projectName?: string) => {
      try {
        // Step 1: Collect all user preferences
        const config: UserConfig = await collectPrompts(projectName);

        // Step 2: Validate feature compatibility
        validateConfig(config);

        // Step 3: Generate the project
        const generator = new ProjectGenerator(config);
        await generator.generate();

        // Step 4: Print success message with documentation map
        printSuccessMessage(config);
      } catch (error) {
        console.error(chalk.red("❌ Error:"), error.message);
        process.exit(1);
      }
    });

  program
    .command("add <feature>")
    .description("Add a feature to existing project")
    .action(async (feature: string) => {
      // Add features to existing project
      console.log(chalk.blue(`Adding ${feature}...`));
    });

  program.parse(process.argv);
}

function validateConfig(config: UserConfig) {
  // MongoDB only works with Mongoose
  if (config.database === "mongodb" && config.orm === "typeorm") {
    console.log(
      chalk.yellow(
        "⚠️  TypeORM with MongoDB is limited. Switching to Mongoose...",
      ),
    );
    config.orm = "mongoose";
  }

  // Prisma doesn't fully support MongoDB features
  if (config.database === "mongodb" && config.orm === "prisma") {
    console.log(
      chalk.yellow(
        "⚠️  Prisma MongoDB support is limited. Proceed with caution.",
      ),
    );
  }
}

function printSuccessMessage(config: UserConfig) {
  const loginSummary = {
    "📧 Email":
      [
        config.loginTypes.includes("email-password") && "Password",
        config.loginTypes.includes("email-otp") && "OTP",
        config.loginTypes.includes("magic-link") && "Magic Link",
      ]
        .filter(Boolean)
        .join(", ") || null,

    "📱 Mobile":
      [
        config.loginTypes.includes("mobile-otp") && "OTP",
        config.loginTypes.includes("mobile-password") && "Password",
      ]
        .filter(Boolean)
        .join(", ") || null,

    "🌐 OAuth":
      config.oauthProviders.length > 0
        ? config.oauthProviders.map((p) => p.replace("-oauth", "")).join(", ")
        : null,

    "🏢 Enterprise":
      [
        config.loginTypes.includes("ldap") && "LDAP",
        config.loginTypes.includes("saml") && "SAML",
        config.loginTypes.includes("api-key") && "API Key",
      ]
        .filter(Boolean)
        .join(", ") || null,
  };

  console.log("\n" + chalk.green("✅ Project generated successfully!\n"));
  console.log(chalk.cyan("🔑 Login Methods Enabled:"));
  console.log(chalk.white("─".repeat(45)));

  for (const [label, value] of Object.entries(loginSummary)) {
    if (value) console.log(`  ${label}: ${chalk.yellow(value)}`);
  }

  console.log(chalk.white("─".repeat(45)));
  console.log(chalk.cyan("\n📋 Documentation Map:"));
  console.log(`  📖 Full Docs:   ${config.projectName}/docs/README.md`);
  console.log(`  🗺️  API Map:     ${config.projectName}/docs/API_MAP.md`);
  console.log(`  🔧 Setup:       ${config.projectName}/docs/SETUP_GUIDE.md`);
}
