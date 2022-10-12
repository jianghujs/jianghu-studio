/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as path from "path";
import * as vscode from "vscode";
import { Constants, TableEnum } from "../common/constants";
import JianghuKnexManager from "../core/jianghuKnexManager";
import { BaseTreeView } from "./base/treeView";
import { EntryItem } from "./tree/entryItem";

// 树的内容组织管理
export class ConstructionPlanViewPagePlanList extends BaseTreeView implements vscode.TreeDataProvider<EntryItem> {
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
      const { contextValue, currDatabase, pageId, label } = element;
      const childs: EntryItem[] | PromiseLike<EntryItem[]> = [];

      switch (contextValue) {
        case "databaseItem": {
          // @ts-ignore
          const pages: any[] = await JianghuKnexManager.client(currDatabase)(TableEnum._page).select();
          for (const page of pages) {
            const item = new EntryItem({ label: page.pageName, value: page.pageId, currDatabase, type: "page" }, vscode.TreeItemCollapsibleState.Collapsed);
            childs.push(item);
          }
          return childs;
        }
        case "pageItem": {
          for (const name of ["Resource", "UiAction"]) {
            const item = new EntryItem({ label: name, value: pageId, currDatabase, type: "view" }, vscode.TreeItemCollapsibleState.Collapsed);
            childs.push(item);
          }
          return childs;
        }
        case "resourceItem":
        case "uiActionItem":
        case "viewItem":
          // eslint-disable-next-line no-case-declarations
          let itemList: any[] = [];
          // eslint-disable-next-line no-case-declarations
          let key = "actionId";
          if (label === "Resource") {
            // @ts-ignore
            itemList = await JianghuKnexManager.client(currDatabase)(TableEnum._resource).where({ pageId }).select();
            key = "actionId";
            console.log(pageId, itemList);
          } else if (label === "UiAction") {
            // @ts-ignore
            itemList = await JianghuKnexManager.client(currDatabase)(TableEnum._ui).where({ pageId }).select();
            key = "uiActionId";
          }
          for (const item of itemList) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            const cache = new EntryItem({ label: `${item[key]}: ${item.desc}`, type: label, currDatabase, value: { pageId, actionId: item[key] } }, vscode.TreeItemCollapsibleState.None);
            childs.push(cache);
          }
          return childs;
      }
      return childs;
    } else {
      this.getDatabaseList();
      return this.getCurrentResourceUi();
    }
  }

  public getCurrentResourceUi() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return [];
    }
    const extname = path.extname(activeEditor.document.uri.fsPath);
    if (extname !== ".html") {
      return [];
    }
    const basename = path.basename(activeEditor.document.uri.fsPath);
    const dbData: { list: any[] } | undefined = vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX).get("databaseList");
    const dbList = dbData && dbData.list ? dbData.list : [];
    if (!dbList || !dbList.length) {
      return [];
    }
    const currDatabase = dbList.find((e: { dir: string }) => activeEditor.document.uri.fsPath.includes(e.dir + "\\") || activeEditor.document.uri.fsPath.includes(e.dir + "/"));
    if (!currDatabase) {
      return [];
    }
    const pageId = basename.split(".")[0];
    const arr = [];
    for (const name of ["Resource", "UiAction"]) {
      const item = new EntryItem({ label: name, value: pageId, currDatabase, type: "view" }, vscode.TreeItemCollapsibleState.Collapsed);
      arr.push(item);
    }
    return arr;
  }
}
