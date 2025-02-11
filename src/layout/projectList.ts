import * as vscode from "vscode";
import { BaseTreeView } from "./base/treeView";
import { EntryItem } from "./tree/entryItem";
import * as path from "path";
import * as fs from "fs";

// 树的内容组织管理
export class ProjectList extends BaseTreeView implements vscode.TreeDataProvider<EntryItem> {
  /**
   * 获取菜单
   * @param element
   * @returns
   */
  public async getChildren(element?: EntryItem): Promise<EntryItem[]> {
    if (!this.workspaceRoot) {
      void vscode.window.showInformationMessage("No dependency in empty workspace");
      return Promise.resolve([]);
    }
    const childs: EntryItem[] | PromiseLike<EntryItem[]> = [];
    if (element) {
      const { contextValue, currDatabase } = element;
      switch (contextValue) {
        case "databaseItem": {
          // @ts-ignore
          const pages: any[] = [
            { pageId: "initJson", pageName: "Init-json" },
            { pageId: "commonTool", pageName: "常用工具" },
          ];
          for (const { pageId, pageName } of pages) {
            const item = new EntryItem({ label: pageName, value: pageId, currDatabase, type: pageId }, vscode.TreeItemCollapsibleState.Expanded);
            childs.push(item);
          }
          return childs;
        }
        case "initJsonItem": {
          // 扫描项目 init-json 文件夹
          const initJsonPath = path.join(currDatabase.dir, "app/view/init-json");
          // 判断文件夹不存在则返回 []
          if (!fs.existsSync(initJsonPath)) {
            return [];
          }
          const files = fs.readdirSync(initJsonPath);
          const pages: any[] = [
            { value: "page", type: "initJsonPage" },
            { value: "component", type: "initJsonComponent" },
          ];
          for (const { value, type } of pages) {
            const item = new EntryItem({ label: value, value, currDatabase, type }, vscode.TreeItemCollapsibleState.Expanded);
            childs.push(item);
          }
          return childs;
        }
        case "initJsonPage": {
          // 扫描项目 init-json 文件夹
          const initJsonPath = path.join(currDatabase.dir, "app/view/init-json/page");
          // 判断文件夹不存在则返回 []
          if (!fs.existsSync(initJsonPath)) {
            return [];
          }
          const files = fs.readdirSync(initJsonPath);
          for (const file of files) {
            const item = new EntryItem({ label: file, value: file, currDatabase, type: "initJsonPageFile" }, vscode.TreeItemCollapsibleState.None);

            item.command = {
              command: "pageView.designPage", // 命令id
              title: file,
              arguments: [
                {
                  pageId: element.currDatabase.dir + "/app/view/init-json/page/" + file,
                  currDatabase: element.currDatabase,
                },
              ], // 命令接收的参数
            };
            childs.push(item);
          }
          return childs;
        }
        case "initJsonComponent": {
          // 扫描项目 init-json 文件夹
          const initJsonPath = path.join(currDatabase.dir, "app/view/init-json/component");
          // 判断文件夹不存在则返回 []
          if (!fs.existsSync(initJsonPath)) {
            return [];
          }
          const files = fs.readdirSync(initJsonPath);
          for (const file of files) {
            const item = new EntryItem({ label: file, value: file, currDatabase, type: "initJsonComponentFile" }, vscode.TreeItemCollapsibleState.None);
            item.command = {
              command: "pageView.designPage", // 命令id
              title: file,
              arguments: [
                {
                  pageId: file,
                  currDatabase: element.currDatabase,
                  pageName: file,
                },
              ], // 命令接收的参数
            };
            childs.push(item);
          }
          return childs;
        }
        case "commonToolItem": {
          const pages: any[] = [
            { value: "sortResourceId", label: "排序resourceId", type: "sortResourceId", execute: "jianghu-init script --type=sortResourceId" },
            { value: "exportSql", label: "从数据库导出sql", type: "exportSql", execute: "jianghu-init script --type=exportSql" },
            { value: "exportMd", label: "导出项目文档", type: "exportMd", execute: "jianghu-init script --type=exportMd" },
          ];

          for (const { value, label, type, execute } of pages) {
            const item = new EntryItem({ label, value, currDatabase, type }, vscode.TreeItemCollapsibleState.None);

            item.command = {
              command: "common.execute", // 命令id
              title: label,
              arguments: [
                {
                  name: label,
                  dir: element.currDatabase.dir,
                  execute,
                },
              ], // 命令接收的参数
            };
            childs.push(item);
          }
          return childs;
        }
      }
    } else {
      return this.getDatabaseList();
    }
  }
}
