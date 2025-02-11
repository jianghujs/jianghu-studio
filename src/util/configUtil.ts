import path = require("path");
import * as vscode from "vscode";
import * as fs from "fs";

export class ConfigUtil {
  public static readPackageJsonDevCommand(dir: string) {
    const packageJsonPath = path.join(dir, "package.json");
    if (this.pathExists(packageJsonPath)) {
      if (!fs.readFileSync(packageJsonPath, "utf-8").includes("@jianghujs/jianghu")) {
        return;
      }
      // 读取package.json中的scripts.dev的值
      return JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    }
    return null;
  }

  public static readDatabaseConfig(dir: string) {
    const configPath = path.join(dir, "config/config.local.js");
    if (!this.pathExists(configPath)) {
      // 复制 config.local.example.js 到 config.local.js
      const configLocalExamplePath = path.join(dir, "config/config.local.example.js");
      if (!this.pathExists(configLocalExamplePath)) {
        return null;
      }
      fs.copyFileSync(configLocalExamplePath, configPath);
    }
    const databaseConfig = ConfigUtil.getDatabaseConnection(configPath);
    return databaseConfig;
  }


  /**
   * 获取config.loacl 文件connection对象
   * @param configPath
   * @returns
   */
  private static getDatabaseConnection(configPath: string) {
    const configData = fs.readFileSync(configPath).toString();
    const setting: any = {};
    // 去除注释
    let fileContent: any = configData.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "");
    // 匹配到 connection 配置的块
    fileContent = fileContent.match(/connection: {[\s\S]*?}/)?.[0] || "";
    ["host", "port", "user", "password", "database"].forEach(key => {
      const regStr = `${key}:\s?(.*)`;
      const reg = new RegExp(regStr);
      const matchResult: RegExpMatchArray | null = fileContent.match(reg);
      if (!matchResult) {
        return {};
      }
      setting[key] = matchResult[1].replace(/'/g, "").replace(/\s+/g, "").replace(/,/g, "").replace(/"/g, "");
    });

    // 如果配置文件中包含 process.env 则需要读取 .env 文件
    if (Object.values(setting).join("").includes("process.env")) {
      const dotenvRequire = configData.match(/require\('dotenv'\).config\({path:\s*(.*)}\)/);
      const envContent = dotenvRequire ? ConfigUtil.loadDotEnv(dotenvRequire[1], configPath) : {};
      for (const key in setting) {
        if (setting[key].includes("process.env")) {
          const k = setting[key].split(".").pop();
          setting[key] = envContent[k] || setting[key];
        }
      }
    }

    // 如果配置中仍包含 process.env 则说明配置文件中的配置不正确
    if (Object.values(setting).join("").includes("process.env")) {
      this.core.error("请检查配置文件 config.local.js 中的数据库连接配置是否正确");
      process.exit();
    }
    return setting;
  }

  private static loadDotEnv(dotenvRequire: string, configPath: string) {
    // 切换到 config 目录下读取 .env 文件
    // 记录 pwd
    const oldPath = process.cwd();
    const dotenvAbsolutePath: any = dotenvRequire.match(/['"](.*)['"]/);
    const envFilePath = path.resolve(configPath, "../", dotenvAbsolutePath[1]);
    // eslint-disable-next-line no-eval
    const data = fs.readFileSync(envFilePath, "utf-8");
    const lines = data.split("\n");
    const env: any = {};
    for (const line of lines) {
      const [key, value] = line.split("=");
      if (key && value) {
        env[key] = value;
      }
    }
    process.chdir(oldPath);
    return env;
  }

  private static pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }

    return true;
  }
}
