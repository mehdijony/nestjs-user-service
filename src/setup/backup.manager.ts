// src/setup/backup.manager.ts
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";

export interface BackupManifest {
  timestamp: string;
  projectRoot: string;
  backedUpFiles: string[]; // files that existed before
  generatedFiles: string[]; // files we created
  generatedDirs: string[]; // dirs we created
  addedDependencies: string[]; // packages we installed
  addedDevDependencies: string[]; // dev packages we installed
  modifiedFiles: string[]; // files we modified (app.module, .env etc)
  config: any; // user config used during setup
}

export class BackupManager {
  private backupDir: string;
  private manifestPath: string;
  private manifest: BackupManifest;

  constructor(projectRoot: string) {
    this.backupDir = path.join(projectRoot, ".user-service-backup");
    this.manifestPath = path.join(this.backupDir, "manifest.json");
    this.manifest = {
      timestamp: new Date().toISOString(),
      projectRoot,
      backedUpFiles: [],
      generatedFiles: [],
      generatedDirs: [],
      addedDependencies: [],
      addedDevDependencies: [],
      modifiedFiles: [],
      config: null,
    };
  }

  // ──────────────────────────────────────────────
  //  CREATE BACKUP BEFORE SETUP
  // ──────────────────────────────────────────────
  async createBackup(): Promise<void> {
    // Create backup directory
    await fs.ensureDir(this.backupDir);

    // Add .gitignore so backup isn't committed
    await fs.writeFile(path.join(this.backupDir, ".gitignore"), "*\n");

    console.log(chalk.cyan("📸 Creating restore point..."));
  }

  // ──────────────────────────────────────────────
  //  BACKUP A FILE BEFORE MODIFYING IT
  //  Call this BEFORE you modify any existing file
  // ──────────────────────────────────────────────
  async backupFile(filePath: string): Promise<void> {
    if (!(await fs.pathExists(filePath))) return;

    // Create relative path for backup
    const relativePath = path.relative(this.manifest.projectRoot, filePath);
    const backupPath = path.join(this.backupDir, "files", relativePath);

    // Copy file to backup location
    await fs.ensureDir(path.dirname(backupPath));
    await fs.copyFile(filePath, backupPath);

    // Track it
    if (!this.manifest.backedUpFiles.includes(relativePath)) {
      this.manifest.backedUpFiles.push(relativePath);
    }
    if (!this.manifest.modifiedFiles.includes(relativePath)) {
      this.manifest.modifiedFiles.push(relativePath);
    }
  }

  // ──────────────────────────────────────────────
  //  TRACK A NEWLY GENERATED FILE
  //  Call this AFTER you create a new file
  // ──────────────────────────────────────────────
  trackGeneratedFile(filePath: string): void {
    const relativePath = path.relative(this.manifest.projectRoot, filePath);
    if (!this.manifest.generatedFiles.includes(relativePath)) {
      this.manifest.generatedFiles.push(relativePath);
    }
  }

  // ──────────────────────────────────────────────
  //  TRACK A NEWLY GENERATED DIRECTORY
  // ──────────────────────────────────────────────
  trackGeneratedDir(dirPath: string): void {
    const relativePath = path.relative(this.manifest.projectRoot, dirPath);
    if (!this.manifest.generatedDirs.includes(relativePath)) {
      this.manifest.generatedDirs.push(relativePath);
    }
  }

  // ──────────────────────────────────────────────
  //  TRACK INSTALLED PACKAGES
  // ──────────────────────────────────────────────
  trackAddedDependencies(deps: string[]): void {
    this.manifest.addedDependencies.push(
      ...deps.filter((d) => !this.manifest.addedDependencies.includes(d)),
    );
  }

  trackAddedDevDependencies(devDeps: string[]): void {
    this.manifest.addedDevDependencies.push(
      ...devDeps.filter((d) => !this.manifest.addedDevDependencies.includes(d)),
    );
  }

  // ──────────────────────────────────────────────
  //  SAVE CONFIG USED
  // ──────────────────────────────────────────────
  setConfig(config: any): void {
    this.manifest.config = config;
  }

  // ──────────────────────────────────────────────
  //  BACKUP package.json AND package-lock.json
  //  BEFORE any npm install
  // ──────────────────────────────────────────────
  async backupPackageFiles(): Promise<void> {
    const root = this.manifest.projectRoot;

    // package.json
    await this.backupFile(path.join(root, "package.json"));

    // Lock files (whichever exists)
    const lockFiles = [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
    ];

    for (const lock of lockFiles) {
      const lockPath = path.join(root, lock);
      if (await fs.pathExists(lockPath)) {
        await this.backupFile(lockPath);
      }
    }
  }

  // ──────────────────────────────────────────────
  //  SAVE MANIFEST  (call at end of setup)
  // ──────────────────────────────────────────────
  async saveManifest(): Promise<void> {
    await fs.writeJSON(this.manifestPath, this.manifest, { spaces: 2 });
    console.log(
      chalk.green("  ✅ Restore point saved at .user-service-backup/"),
    );
  }

  // ──────────────────────────────────────────────
  //  CHECK IF BACKUP EXISTS
  // ──────────────────────────────────────────────
  static async hasBackup(projectRoot: string): Promise<boolean> {
    const manifestPath = path.join(
      projectRoot,
      ".user-service-backup",
      "manifest.json",
    );
    return fs.pathExists(manifestPath);
  }

  // ──────────────────────────────────────────────
  //  LOAD EXISTING MANIFEST
  // ──────────────────────────────────────────────
  static async loadManifest(
    projectRoot: string,
  ): Promise<BackupManifest | null> {
    const manifestPath = path.join(
      projectRoot,
      ".user-service-backup",
      "manifest.json",
    );

    if (!(await fs.pathExists(manifestPath))) return null;
    return fs.readJSON(manifestPath);
  }

  // ──────────────────────────────────────────────
  //  ROLLBACK — RESTORE EVERYTHING
  // ──────────────────────────────────────────────
  static async rollback(projectRoot: string): Promise<void> {
    const spinner = ora();
    const backupDir = path.join(projectRoot, ".user-service-backup");
    const manifestPath = path.join(backupDir, "manifest.json");

    // ── Load manifest ──
    if (!(await fs.pathExists(manifestPath))) {
      throw new Error(
        "No backup found. Nothing to rollback.\n" +
          "Rollback is only available after running: npx user-service-setup init",
      );
    }

    const manifest: BackupManifest = await fs.readJSON(manifestPath);

    console.log(chalk.cyan("\n🔄 Rolling back to restore point..."));
    console.log(chalk.gray(`  Created: ${manifest.timestamp}\n`));

    try {
      // ── Step 1: Delete all generated files ──
      spinner.start("Removing generated files...");
      let removedFiles = 0;

      for (const relativePath of manifest.generatedFiles) {
        const filePath = path.join(projectRoot, relativePath);
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          removedFiles++;
        }
      }
      spinner.succeed(`Removed ${removedFiles} generated file(s)`);

      // ── Step 2: Delete generated directories (deepest first) ──
      spinner.start("Removing generated directories...");
      const sortedDirs = [...manifest.generatedDirs].sort(
        (a, b) => b.length - a.length, // deepest first
      );

      let removedDirs = 0;
      for (const relativePath of sortedDirs) {
        const dirPath = path.join(projectRoot, relativePath);
        if (await fs.pathExists(dirPath)) {
          // Only remove if empty or was fully generated
          const contents = await fs.readdir(dirPath);
          if (contents.length === 0) {
            await fs.remove(dirPath);
            removedDirs++;
          }
        }
      }

      // Remove the main user-service directory
      const userServiceDir = path.join(projectRoot, "src", "user-service");
      if (await fs.pathExists(userServiceDir)) {
        await fs.remove(userServiceDir);
        removedDirs++;
      }

      // Remove docs generated
      const docsFile = path.join(projectRoot, "docs", "USER_SERVICE.md");
      if (await fs.pathExists(docsFile)) {
        await fs.remove(docsFile);
      }

      spinner.succeed(`Removed ${removedDirs} generated director(ies)`);

      // ── Step 3: Restore modified files from backup ──
      spinner.start("Restoring original files...");
      let restoredFiles = 0;

      for (const relativePath of manifest.backedUpFiles) {
        const backupPath = path.join(backupDir, "files", relativePath);
        const originalPath = path.join(projectRoot, relativePath);

        if (await fs.pathExists(backupPath)) {
          await fs.copyFile(backupPath, originalPath);
          restoredFiles++;
        }
      }
      spinner.succeed(`Restored ${restoredFiles} original file(s)`);

      // ── Step 4: Uninstall added packages ──
      if (
        manifest.addedDependencies.length > 0 ||
        manifest.addedDevDependencies.length > 0
      ) {
        spinner.start("Removing added packages...");

        const allPackagesToRemove = [
          ...manifest.addedDependencies,
          ...manifest.addedDevDependencies,
        ];

        if (allPackagesToRemove.length > 0) {
          // Detect package manager from lock file
          const pm = await BackupManager.detectPm(projectRoot);

          const uninstallCmd: Record<string, string> = {
            npm: "npm uninstall",
            yarn: "yarn remove",
            pnpm: "pnpm remove",
            bun: "bun remove",
          };

          try {
            const { execSync } = await import("child_process");
            execSync(`${uninstallCmd[pm]} ${allPackagesToRemove.join(" ")}`, {
              cwd: projectRoot,
              stdio: "pipe", // silent
            });
          } catch {
            // Some packages might have been manually removed
            // Ignore errors here
          }
        }

        spinner.succeed(
          `Removed ${manifest.addedDependencies.length} dep(s) ` +
            `+ ${manifest.addedDevDependencies.length} devDep(s)`,
        );
      }

      // ── Step 5: Restore lock file from backup ──
      spinner.start("Restoring package lock file...");

      const lockFiles = [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lockb",
      ];

      for (const lock of lockFiles) {
        const backupLock = path.join(backupDir, "files", lock);
        if (await fs.pathExists(backupLock)) {
          await fs.copyFile(backupLock, path.join(projectRoot, lock));
        }
      }

      // Reinstall to sync lock file with restored package.json
      const pm = await BackupManager.detectPm(projectRoot);
      const installCmd: Record<string, string> = {
        npm: "npm install",
        yarn: "yarn install",
        pnpm: "pnpm install",
        bun: "bun install",
      };

      try {
        const { execSync } = await import("child_process");
        execSync(installCmd[pm], {
          cwd: projectRoot,
          stdio: "pipe",
        });
      } catch {
        // ignore
      }

      spinner.succeed("Package lock file restored");

      // ── Step 6: Remove prisma schema if it was created ──
      if (manifest.config?.orm === "prisma") {
        const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
        const schemaBackup = path.join(
          backupDir,
          "files",
          "prisma",
          "schema.prisma",
        );

        if (await fs.pathExists(schemaBackup)) {
          // Restore original
          await fs.copyFile(schemaBackup, schemaPath);
        } else if (await fs.pathExists(schemaPath)) {
          // We created it — remove it
          await fs.remove(path.join(projectRoot, "prisma"));
        }
      }

      // ── Step 7: Handle docker-compose.yml ──
      const dockerBackup = path.join(backupDir, "files", "docker-compose.yml");
      const dockerPath = path.join(projectRoot, "docker-compose.yml");

      if (await fs.pathExists(dockerBackup)) {
        // Restore original
        await fs.copyFile(dockerBackup, dockerPath);
      } else if (
        manifest.config?.enableDocker &&
        (await fs.pathExists(dockerPath))
      ) {
        // We created it from scratch — remove it
        await fs.remove(dockerPath);
      }

      // ── Step 8: Remove backup directory ──
      spinner.start("Cleaning up backup files...");
      await fs.remove(backupDir);
      spinner.succeed("Backup files cleaned up");

      // ── Done ──
      console.log("\n" + chalk.green("✅ Rollback complete!"));
      console.log(
        chalk.green(
          "   Project restored to state before user-service setup.\n",
        ),
      );
      console.log(
        chalk.gray(
          "   You can run npx user-service-setup init again anytime.\n",
        ),
      );
    } catch (error: any) {
      spinner.fail("Rollback failed: " + error.message);
      console.log(
        chalk.yellow(
          "\n⚠️  Partial rollback. Backup still exists at .user-service-backup/",
        ),
      );
      console.log(
        chalk.yellow("   You can manually restore files from there.\n"),
      );
      throw error;
    }
  }

  // ──────────────────────────────────────────────
  //  DETECT PACKAGE MANAGER
  // ──────────────────────────────────────────────
  private static async detectPm(rootPath: string): Promise<string> {
    if (await fs.pathExists(path.join(rootPath, "bun.lockb"))) return "bun";
    if (await fs.pathExists(path.join(rootPath, "pnpm-lock.yaml")))
      return "pnpm";
    if (await fs.pathExists(path.join(rootPath, "yarn.lock"))) return "yarn";
    return "npm";
  }
}
