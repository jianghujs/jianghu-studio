/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as vscode from "vscode";

// 树节点
export class EntryItem extends vscode.TreeItem {
  // 存储当前数据库obj
  public currDatabase: any;
  public pageId: any;
  public appId: string | null;
  public appTitle: string | null;
  public menuId: string | null;
  public menuLabel: string | null;
  public children: EntryItem[];
  private pageName: string | null;

  constructor({ label, value, currDatabase, type, appId, appTitle, menuId, menuLabel, children }: any, collapsibleState: vscode.TreeItemCollapsibleState | undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super(label, collapsibleState);
    this.currDatabase = currDatabase; // 正确
    this.pageName = label;
    this.appId = appId;
    this.appTitle = appTitle;
    this.menuId = menuId;
    this.menuLabel = menuLabel;
    this.children = children || [];
    // 兼容不同的层级
    switch (type) {
      case "app":
        this.contextValue = "appItem";
        this.tooltip = `${label}@${value}`;
        break;
      case "menu":
        this.contextValue = "menuItem";
        this.tooltip = `${label}`;
        break;
      case "database":
        this.contextValue = "databaseItem";
        this.tooltip = `${currDatabase.host}@${currDatabase.port}`;
        break;
      case "page":
        this.contextValue = "pageItem";
        this.tooltip = `pageId：${value}`;
        this.pageId = value;
        break;
      case "view":
        if (label === "Resource") {
          this.contextValue = "resourceItem";
        } else if (label === "UiAction") {
          this.contextValue = "uiActionItem";
        } else {
          this.contextValue = "viewItem";
        }
        this.pageId = value;
        break;
      case "Resource":
      case "UiAction":
        this.contextValue = "viewList";
        this.pageName = type;
        this.pageId = value;
        break;
      default: {
        this.contextValue = "viewList";
        break;
      }
    }
  }
}
