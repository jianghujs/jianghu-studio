/*
 * @Author: case 7795958+lipangpang251@user.noreply.gitee.com
 * @Date: 2022-06-11 19:30:28
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-08-15 16:43:10
 * @FilePath: \framework\src\layout\base\treeView.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../../common/constants";
import AppCore from "../../core";
import { PathUtil } from "../../util/pathUtil";
import { EntryItem } from "../tree/entryItem";
import AppManager from "../../core/appManager";

// 树的内容组织管理
export class BaseTreeView {
  public core: AppCore;
  public configList: any[];
  public workspaceRoot: string;
  public context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, core: AppCore) {
    this.core = core;
    this.workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
    this.configList = [];
    this.context = context;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public onDidChangeTreeData?: vscode.Event<void | EntryItem | null | undefined> | undefined;

  public getTreeItem(element: EntryItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  /**
   * 提取工作目录下的项目
   */
  public getAppList() {
    PathUtil.findProjectConfig(this.workspaceRoot);
    void vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX).update("appList", { list: AppManager.appList }, true);
  }
  /**
   * 查找项目数据库列表
   * @returns
   */
  public getDatabaseList() {
    this.findConfigDatabase(this.workspaceRoot);
    void vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX).update("databaseList", { list: this.configList }, true);
    const arr = [];
    for (const item of this.configList) {
      arr.push(new EntryItem({ label: item.database, value: "", currDatabase: item, type: "database", command: "webviewHandler.openAppHomePage" }, vscode.TreeItemCollapsibleState.Collapsed));
    }
    return arr;
  }
  /**
   * 递归查找[jhconfig]文件，读取 config.local.js
   * @param dir
   * @returns
   */
  private findConfigDatabase(dir: string) {
    const configPath = path.join(dir, "config/config.local.js");
    const packageJsonPath = path.join(dir, "package.json");
    if (PathUtil.pathExists(packageJsonPath) && PathUtil.pathExists(configPath)) {
      if (!fs.readFileSync(packageJsonPath, "utf-8").includes("egg-jianghu") && !fs.readFileSync(packageJsonPath, "utf-8").includes("@jianghujs/jianghu")) {
        return;
      }
      this.configList.push({ ...this.getDepsInConfigJs(configPath), dir });
    } else {
      const dirArray = fs.readdirSync(dir);
      for (const item of dirArray) {
        // 跳过无必要的深层文件夹
        if (!PathUtil.isDir(path.join(dir, item)) || ["app", "logs", "node_modules", "run", "sql", "typings", "upload"].includes(item)) {
          continue;
        }
        this.findConfigDatabase(path.join(dir, item));
      }
    }
  }

  /**
   * 获取config.loacl 文件connection对象
   * @param configPath
   * @returns
   */
  private getDepsInConfigJs(configPath: string) {
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
      const envContent = dotenvRequire ? this.loadDotEnv(dotenvRequire[1], configPath) : {};
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

  private loadDotEnv(dotenvRequire: string, configPath: string) {
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
}
