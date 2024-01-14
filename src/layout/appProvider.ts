/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as vscode from "vscode";
import { BaseTreeView } from "./base/treeView";
import { EntryItem } from "./tree/entryItem";
import AppManager from "../core/appManager";

// 树的内容组织管理
export class AppProvider extends BaseTreeView implements vscode.TreeDataProvider<EntryItem> {
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
      // 配置应用的二级左侧树菜单
      const { appId, appTitle } = element;
      if (appId) {
        void vscode.commands.executeCommand("webviewHandler.openAppHomePage", { pageId: "appHome", currDatabase: null, pageName: `应用【${appTitle}】首页` });
        // 应用的菜单
        const appMenus: EntryItem[] = AppManager.client(element);
        return appMenus;
      } else {
        // 配置三级菜单
        return [];
      }
    } else {
      return this.getAppList();
    }
  }
}
