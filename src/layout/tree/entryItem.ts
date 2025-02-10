/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as vscode from "vscode";

// 树节点
export class EntryItem extends vscode.TreeItem {
  // 存储当前数据库obj
  public currDatabase: any;
  public pageId: any;
  private pageName: any;
  constructor({ label, value, currDatabase, type }: any, collapsibleState: vscode.TreeItemCollapsibleState | undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super(label, collapsibleState);
    this.currDatabase = currDatabase; // 正确
    this.pageName = label;
    // 兼容不同的层级
    switch (type) {
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
      case "initJson":
        this.contextValue = "initJsonItem";
        break;
      case "initJsonPage":
        this.contextValue = "initJsonPage";
        break;
      case "initJsonComponent":
        this.contextValue = "initJsonComponent";
        break;
      case "commonTool":
        this.contextValue = "commonToolItem";
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
