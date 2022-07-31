import * as vscode from "vscode";
import { BaseTreeView } from "./base/treeView";
import { EntryItem } from "./tree/entryItem";

// 树的内容组织管理
export class ConstructionAdvancedPageList extends BaseTreeView implements vscode.TreeDataProvider<EntryItem> {
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
      const pages = [
        { pageId: "userManagement", pageName: "用户管理" },
        { pageId: "recordHistoryManagement", pageName: "数据历史" },
        { pageId: "userGroupRoleManagement", pageName: "用户权限" },
      ];
      const childs = [];
      for (const page of pages) {
        const item = new EntryItem({ label: page.pageName, value: page.pageId, currDatabase: element.currDatabase, type: "page" }, vscode.TreeItemCollapsibleState.None);
        item.command = {
          command: `constructionAdvanced.${page.pageId}`, // 命令id
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
