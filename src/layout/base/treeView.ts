/*
 * @Author: case 7795958+lipangpang251@user.noreply.gitee.com
 * @Date: 2022-06-11 19:30:28
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-08-15 16:34:22
 * @FilePath: \framework\src\layout\base\treeView.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as fs from "fs";
import * as json5 from "json5";
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../../common/constants";
import constructionPlanCore from "../../core";
import { PathUtil } from "../../util/pathUtil";
import { EntryItem } from "../tree/entryItem";

// 树的内容组织管理
export class BaseTreeView {
  public core: constructionPlanCore;
  public configList: any[];
  public workspaceRoot: string;

  constructor(core: constructionPlanCore) {
    this.core = core;
    this.workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
    this.configList = [];
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public onDidChangeTreeData?: vscode.Event<void | EntryItem | null | undefined> | undefined;

  public getTreeItem(element: EntryItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
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
      arr.push(new EntryItem({ label: item.database, value: "", currDatabase: item, type: "database" }, vscode.TreeItemCollapsibleState.Collapsed));
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
    if (this.pathExists(packageJsonPath) && this.pathExists(configPath)) {
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
   * 判断path
   * @param p
   * @returns
   */
  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }

    return true;
  }

  /**
   * 获取config.loacl 文件connection对象
   * @param configPath
   * @returns
   */
  private getDepsInConfigJs(configPath: string) {
    const patter = /(connection:)([\s\S]*?)}/g;
    console.log(configPath);
    const configArr: any = fs.readFileSync(configPath, "utf-8").match(patter);
    if (configArr && configArr.length) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const jsonStr = `{${configArr[0]}}`.replace(/(?:\s*['"]*)?([a-zA-Z0-9]+)(?:['"]*\s*)?:/g, '"$1":').replace(/'/g, '"');
      return json5.parse(jsonStr).connection;
    }
  }
}
