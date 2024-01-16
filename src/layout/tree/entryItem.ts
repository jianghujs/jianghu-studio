/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as vscode from "vscode";
import { ICommand } from "../../common/ICommand";

// 树节点
export class EntryItem extends vscode.TreeItem {
  // 存储当前数据库obj
  public currDatabase: any;
  public pageId: any;
  public appId: string | null;
  public appTitle: string | null;
  public appDir: string | null;
  public menuId: string | null;
  public menuLabel: string | null;
  public menuList: EntryItem[];
  private pageName: string | null;

  constructor(
    { label, value, currDatabase, type, appId, appTitle, appDir, menuId, menuLabel, menuList, command, commandArgs, iconPath }: any,
    collapsibleState: vscode.TreeItemCollapsibleState | undefined
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super(label, collapsibleState);
    // view使用的 database
    this.currDatabase = currDatabase; // 正确
    // 右侧view名
    this.pageName = label;
    // 应用 ID
    this.appId = appId;
    // 应用名
    this.appTitle = appTitle;
    this.appDir = appDir;
    // 菜单 ID
    this.menuId = menuId;
    // 菜单名
    this.menuLabel = menuLabel;
    // 左侧树下级菜单
    this.menuList = menuList || [];
    this.pageId = value;

    // 菜单点击命令
    if (command) {
      this.command = new ICommand(`${label}`, `${command}`, undefined, [commandArgs]);
    }
    // 菜单图标
    if (iconPath) {
      this.iconPath = {
        light: iconPath.light,
        dark: iconPath.dark,
      };
    }
    // 兼容不同的层级
    switch (type) {
      case "app":
        this.contextValue = "appItem";
        this.tooltip = `${label}@${value}`;
        break;
      case "menu":
      case "service":
      case "controller":
        this.contextValue = "menuItem";
        this.tooltip = `${label}`;
        break;
      //  1.0 内容 ⬇️
      case "database":
        this.contextValue = "databaseItem";
        this.tooltip = `${currDatabase.host}@${currDatabase.port}`;
        break;
      case "page":
        this.contextValue = "pageItem";
        this.tooltip = `pageId：${value}`;
        break;
      case "view":
        if (label === "Resource") {
          this.contextValue = "resourceItem";
        } else if (label === "UiAction") {
          this.contextValue = "uiActionItem";
        } else {
          this.contextValue = "viewItem";
        }
        break;
      case "Resource":
      case "UiAction":
        this.contextValue = "viewList";
        this.pageName = type;
        break;
      default: {
        this.contextValue = "viewList";
        break;
      }
    }
  }
}
