/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as vscode from "vscode";
import { BaseTreeView } from "./base/treeView";
import { EntryItem } from "./tree/entryItem";
import AppManager from "../core/appManager";
import { PathUtil } from "../util/pathUtil";

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
    // 检查项目列表并保存到配置
    if (!element) {
      this.getAppList();
      const menuList = AppManager.client(element);
      menuList.unshift(
        new EntryItem(
          {
            label: "创建应用",
            type: "manu",
            command: "webviewHandler.openAppCreatePage",
            commandArgs: { pageId: "appCreate", currDatabase: null, pageName: "创建应用" },
            iconPath: {
              light: PathUtil.getExtensionFileAbsolutePath(this.context, "images/light/add.svg"),
              dark: PathUtil.getExtensionFileAbsolutePath(this.context, "images/dark/add.svg"),
            },
          },
          undefined
        )
      );
      return menuList;
    } else {
      return element.menuList;
    }
  }

  public getTreeItem(element: EntryItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  public getParent(element: EntryItem): vscode.ProviderResult<EntryItem> {
    return element.parent;
  }
}
