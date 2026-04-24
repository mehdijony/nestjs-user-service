// src/setup/project.detector.ts
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";

export interface ExistingProjectInfo {
  isNestProject: boolean;
  hasTypeScript: boolean;
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  existingDeps: Record<string, string>;
  hasDocker: boolean;
  hasPrisma: boolean;
  hasTypeORM: boolean;
  hasMongoose: boolean;
  hasEnvFile: boolean;
  nestVersion: string | null;
  srcPath: string;
  rootPath: string;
  appModulePath: string | null;
  mainTsPath: string | null;
}

export class ProjectDetector {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  async detect(): Promise<ExistingProjectInfo> {
    const packageJsonPath = path.join(this.rootPath, "package.json");

    // ── Must have package.json ──
    if (!(await fs.pathExists(packageJsonPath))) {
      throw new Error(
        `No package.json found in ${this.rootPath}.\n` +
          `Please run this command inside your NestJS project root.\n` +
          `Example: nest new my-project && cd my-project`,
      );
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    const allDeps: Record<string, string> = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // ── Must be NestJS project ──
    const isNestProject = !!(
      allDeps["@nestjs/common"] || allDeps["@nestjs/core"]
    );
    if (!isNestProject) {
      throw new Error(
        `This does not appear to be a NestJS project.\n` +
          `@nestjs/common not found in package.json.\n` +
          `Please run inside a NestJS project.`,
      );
    }

    const packageManager = await this.detectPackageManager();
    const srcPath = await this.findSrcPath();
    const appModulePath = await this.findFile(srcPath, "app.module.ts");
    const mainTsPath = await this.findFile(srcPath, "main.ts");
    const nestVersion = allDeps["@nestjs/common"]?.replace(/[\^~]/, "") || null;

    const info: ExistingProjectInfo = {
      isNestProject,
      hasTypeScript: !!allDeps["typescript"],
      packageManager,
      existingDeps: allDeps,
      hasDocker: await fs.pathExists(
        path.join(this.rootPath, "docker-compose.yml"),
      ),
      hasPrisma: !!(allDeps["prisma"] || allDeps["@prisma/client"]),
      hasTypeORM: !!(allDeps["typeorm"] || allDeps["@nestjs/typeorm"]),
      hasMongoose: !!(allDeps["mongoose"] || allDeps["@nestjs/mongoose"]),
      hasEnvFile: await fs.pathExists(path.join(this.rootPath, ".env")),
      nestVersion,
      srcPath,
      rootPath: this.rootPath,
      appModulePath,
      mainTsPath,
    };

    this.printDetectionSummary(info);
    return info;
  }

  private async detectPackageManager(): Promise<
    "npm" | "yarn" | "pnpm" | "bun"
  > {
    if (await fs.pathExists(path.join(this.rootPath, "bun.lockb")))
      return "bun";
    if (await fs.pathExists(path.join(this.rootPath, "pnpm-lock.yaml")))
      return "pnpm";
    if (await fs.pathExists(path.join(this.rootPath, "yarn.lock")))
      return "yarn";
    return "npm";
  }

  private async findSrcPath(): Promise<string> {
    const nestCliPath = path.join(this.rootPath, "nest-cli.json");
    if (await fs.pathExists(nestCliPath)) {
      const nestCli = await fs.readJSON(nestCliPath);
      if (nestCli.sourceRoot) {
        return path.join(this.rootPath, nestCli.sourceRoot);
      }
    }
    return path.join(this.rootPath, "src");
  }

  private async findFile(
    dir: string,
    filename: string,
  ): Promise<string | null> {
    const filePath = path.join(dir, filename);
    if (await fs.pathExists(filePath)) return filePath;
    return null;
  }

  private printDetectionSummary(info: ExistingProjectInfo): void {
    console.log(chalk.cyan("\n🔍 Detected Project Info:"));
    console.log(chalk.white("─".repeat(40)));
    console.log(
      `  NestJS Version:   ${chalk.yellow(info.nestVersion || "unknown")}`,
    );
    console.log(`  Package Manager:  ${chalk.yellow(info.packageManager)}`);
    console.log(`  Source Path:      ${chalk.yellow(info.srcPath)}`);
    console.log(
      `  Has Docker:       ${info.hasDocker ? chalk.green("Yes") : chalk.gray("No")}`,
    );
    console.log(
      `  Has Prisma:       ${info.hasPrisma ? chalk.green("Yes") : chalk.gray("No")}`,
    );
    console.log(
      `  Has TypeORM:      ${info.hasTypeORM ? chalk.green("Yes") : chalk.gray("No")}`,
    );
    console.log(
      `  Has Mongoose:     ${info.hasMongoose ? chalk.green("Yes") : chalk.gray("No")}`,
    );
    console.log(
      `  Has .env:         ${info.hasEnvFile ? chalk.green("Yes") : chalk.gray("No")}`,
    );
    console.log(chalk.white("─".repeat(40)) + "\n");
  }
}
