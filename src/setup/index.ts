// src/setup/index.ts
import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import { ProjectDetector } from "./project.detector";
import { collectPrompts } from "./prompts";
import { Installer } from "./installer";
import { UserConfig } from "../config/feature.matrix";
import { BackupManager } from "./backup.manager";

// ─── THIS IS THE KEY — must be named export ───
export async function run(): Promise<void> {
  console.log(
    chalk.cyan(figlet.textSync("User Service", { horizontalLayout: "full" })),
  );
  console.log(chalk.yellow("  @mehdijony/nestjs-user-service\n"));

  const program = new Command();

  program
    .name("user-service-setup")
    .description("Add user service to your existing NestJS project")
    .version("1.0.0");

  program
    .command("init")
    .description("Initialize user service in current NestJS project")
    .action(async () => {
      try {
        const hasBackup = await BackupManager.hasBackup(process.cwd());
        if (hasBackup) {
          const inquirer = await import("inquirer");
          const { action } = await inquirer.default.prompt([
            {
              type: "list",
              name: "action",
              message: chalk.yellow(
                "User service was already installed. What do you want to do?",
              ),
              choices: [
                {
                  name: "🔄 Rollback first, then reinstall with new options",
                  value: "rollback-reinstall",
                },
                {
                  name: "⬆️  Overwrite existing setup",
                  value: "overwrite",
                },
                {
                  name: "❌ Cancel",
                  value: "cancel",
                },
              ],
            },
          ]);

          if (action === "cancel") {
            console.log(chalk.yellow("\n❌ Cancelled."));
            return;
          }

          if (action === "rollback-reinstall") {
            console.log(
              chalk.blue("\n🔄 Rolling back previous installation...\n"),
            );
            await BackupManager.rollback(process.cwd());
            console.log(chalk.blue("\n📦 Starting fresh installation...\n"));
          }
        }
        // 1. Detect existing project
        console.log(chalk.blue("🔍 Analyzing your NestJS project...\n"));
        const detector = new ProjectDetector(process.cwd());
        const projectInfo = await detector.detect();

        // 2. Collect user preferences
        const config: UserConfig = await collectPrompts(projectInfo);

        // 3. Confirm
        const confirmed = await confirmInstall(config);
        if (!confirmed) {
          console.log(chalk.yellow("\n❌ Setup cancelled."));
          return;
        }

        // 4. Install into project
        const installer = new Installer(config, projectInfo);
        await installer.install();

        // 5. Print success
        printSuccess(config);
      } catch (error: any) {
        console.error(chalk.red("\n❌ Error:"), error.message);
        console.error(
          chalk.gray("Make sure you are inside a NestJS project root."),
        );
        process.exit(1);
      }
    });

  // ─── ROLLBACK COMMAND ───
  program
    .command("rollback")
    .description("Rollback to state before user-service was installed")
    .action(async () => {
      try {
        const hasBackup = await BackupManager.hasBackup(process.cwd());

        if (!hasBackup) {
          console.log(chalk.yellow("\n⚠️  No restore point found."));
          console.log(
            chalk.gray(
              "   Rollback is only available after running: npx user-service-setup init",
            ),
          );
          return;
        }

        // Load and show backup info
        const manifest = await BackupManager.loadManifest(process.cwd());
        if (manifest) {
          console.log(chalk.cyan("\n📋 Restore point info:"));
          console.log(chalk.white("─".repeat(45)));
          console.log(`  Created:      ${chalk.yellow(manifest.timestamp)}`);
          console.log(
            `  Files added:  ${chalk.yellow(String(manifest.generatedFiles.length))}`,
          );
          console.log(
            `  Deps added:   ${chalk.yellow(String(manifest.addedDependencies.length))}`,
          );
          console.log(
            `  Dev deps:     ${chalk.yellow(String(manifest.addedDevDependencies.length))}`,
          );
          console.log(
            `  Modified:     ${chalk.yellow(String(manifest.modifiedFiles.length))}`,
          );
          console.log(chalk.white("─".repeat(45)));
        }

        // Confirm rollback
        const inquirer = await import("inquirer");
        const { confirmed } = await inquirer.default.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message: chalk.red(
              "⚠️  This will restore your project to the state BEFORE user-service was installed.\n" +
                "   All generated files will be deleted.\n" +
                "   All added packages will be removed.\n" +
                "   Modified files will be restored.\n\n" +
                "   Are you sure?",
            ),
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log(chalk.yellow("\n❌ Rollback cancelled."));
          return;
        }

        await BackupManager.rollback(process.cwd());
      } catch (error: any) {
        console.error(chalk.red("\n❌ Rollback error:"), error.message);
        process.exit(1);
      }
    });

  // ─── STATUS COMMAND ───
  program
    .command("status")
    .description(
      "Check if user-service is installed and show restore point info",
    )
    .action(async () => {
      const hasBackup = await BackupManager.hasBackup(process.cwd());

      if (!hasBackup) {
        console.log(chalk.yellow("\n📦 User service is NOT installed."));
        console.log(chalk.gray("   Run: npx user-service-setup init\n"));
        return;
      }

      const manifest = await BackupManager.loadManifest(process.cwd());
      if (manifest) {
        console.log(chalk.green("\n✅ User service is INSTALLED.\n"));
        console.log(chalk.cyan("📋 Installation details:"));
        console.log(chalk.white("─".repeat(50)));
        console.log(`  Installed:     ${chalk.yellow(manifest.timestamp)}`);
        console.log(
          `  Database:      ${chalk.yellow(manifest.config?.database || "unknown")}`,
        );
        console.log(
          `  ORM:           ${chalk.yellow(manifest.config?.orm || "unknown")}`,
        );
        console.log(
          `  Login types:   ${chalk.yellow(manifest.config?.loginTypes?.join(", ") || "unknown")}`,
        );
        console.log(
          `  Files created: ${chalk.yellow(String(manifest.generatedFiles.length))}`,
        );
        console.log(
          `  Deps added:    ${chalk.yellow(String(manifest.addedDependencies.length))}`,
        );
        console.log(chalk.white("─".repeat(50)));
        console.log(
          chalk.gray("\n  To rollback: npx user-service-setup rollback"),
        );
        console.log(
          chalk.gray("  To reinstall: npx user-service-setup init\n"),
        );
      }
    });

  program
    .command("remove")
    .description("Remove user service from project")
    .action(() => {
      console.log(chalk.yellow("🚧 Remove command coming soon..."));
    });

  // ─── Parse args ───
  program.parse(process.argv);

  // ─── Show help if no command given ───
  if (process.argv.length < 3) {
    program.help();
  }
}

// ──────────────────────────────────────────────
//  CONFIRM PROMPT
// ──────────────────────────────────────────────
async function confirmInstall(config: UserConfig): Promise<boolean> {
  const inquirer = await import("inquirer");

  const { confirmed } = await inquirer.default.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message:
        chalk.yellow("\n📋 Ready to install into your project?\n") +
        chalk.white(`   Database:  ${config.database} + ${config.orm}\n`) +
        chalk.white(`   Login:     ${config.loginTypes.join(", ")}\n`) +
        chalk.white(`   API:       ${config.apiStyles.join(", ")}\n`) +
        chalk.yellow("\n   Proceed?"),
      default: true,
    },
  ]);

  return confirmed;
}

// ──────────────────────────────────────────────
//  SUCCESS MESSAGE
// ──────────────────────────────────────────────
function printSuccess(config: UserConfig): void {
  console.log("\n" + chalk.green("✅ User Service installed successfully!\n"));
  console.log(chalk.cyan("📋 What was added:"));
  console.log(chalk.white("─".repeat(45)));
  console.log(`  📁 Module:     src/user-service/`);
  console.log(`  📝 AppModule:  UserServiceModule imported`);
  console.log(`  🔑 Auth:       ${config.loginTypes.length} login method(s)`);
  console.log(`  🗄️  ORM:        ${config.orm} + ${config.database}`);
  console.log(`  📖 Docs:       docs/USER_SERVICE.md`);
  console.log(chalk.white("─".repeat(45)));
  console.log("\n" + chalk.yellow("🚀 Next steps:"));

  if (config.orm === "prisma") {
    console.log(chalk.white("  npx prisma generate"));
    console.log(chalk.white("  npx prisma db push"));
  }
  if (config.enableDocker) {
    console.log(chalk.white("  docker-compose up -d"));
  }
  console.log(chalk.white("  npm run start:dev"));
  console.log(chalk.cyan("\n  📖 Swagger: http://localhost:3000/api/docs\n"));
}
