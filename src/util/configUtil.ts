import path = require("path");
import * as vscode from "vscode";
import * as fs from "fs";
import * as json5 from "json5";

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
    const patter = /(connection:)([\s\S]*?)}/g;
    console.log(configPath);
    const configArr: any = fs.readFileSync(configPath, "utf-8").match(patter);
    if (configArr && configArr.length) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const jsonStr = `{${configArr[0]}}`.replace(/(?:\s*['"]*)?([a-zA-Z0-9]+)(?:['"]*\s*)?:/g, '"$1":').replace(/'/g, '"');
      return json5.parse(jsonStr).connection;
    }
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
