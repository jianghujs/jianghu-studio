/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as vscode from "vscode";
import { TableEnum } from "../common/constants";
import JianghuKnexManager from "../core/jianghuKnexManager";
import { BaseTreeView } from "./base/treeView";
import { EntryItem } from "./tree/entryItem";

// 树的内容组织管理
export class ConstructionPlanPageList extends BaseTreeView implements vscode.TreeDataProvider<EntryItem> {
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
    if (element) {
      // 子节点
      const currDbConfig = element.currDatabase;
      console.log(currDbConfig);
      // @ts-ignore
      const pages: any[] = await JianghuKnexManager.client(element.currDatabase)(TableEnum._page).select();
      const childs = [];
      for (const page of pages) {
        const item = new EntryItem({ label: page.pageName, value: page.pageId, currDatabase: element.currDatabase, type: "page" }, vscode.TreeItemCollapsibleState.None);
        item.command = {
          command: "constructionPlan.pagePlanEdit", // 命令id
          title: page.pageName,
          arguments: [
            {
              pageId: page.pageId,
              currDatabase: element.currDatabase,
              pageName: page.pageName,
            },
          ], // 命令接收的参数
        };
        childs.push(item);
      }
      return childs;
    } else {
      return this.getDatabaseList();
    }
  }
}
