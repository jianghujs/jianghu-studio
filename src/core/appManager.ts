// 处理 resource 相关
import * as vscode from "vscode";
import { Constants, ConstantsValue } from "../common/constants";
import { EntryItem } from "../layout/tree/entryItem";
import { ConfigUtil } from "../util/configUtil";

export default class AppManager {
  public static treeView: vscode.TreeView<EntryItem> | undefined;
  public static appList: any[] = [];
  public static handlerMap = new Map<string, EntryItem>();

  public static client(config?: EntryItem): EntryItem[] {
    // host || "" ===> 这样写是为了 fix eslint的报错
    if (!config) {
      // app列表
      // @ts-ignore
      const workspaceConfig = vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX);
      const { list }: any = workspaceConfig.get("appList");
      for (const appItem of list || []) {
        if (appItem.appId) {
          const currDatabase = ConfigUtil.readDatabaseConfig(appItem.dir as string);
          if (currDatabase === null) {
            continue;
          }
          const newEntryItem = new EntryItem(
            {
              appId: appItem.appId as string,
              value: appItem.appId as string,
              appTitle: appItem.appTitle,
              label: `${appItem.appId as string} - ${appItem.appTitle as string}`,
              type: "app",
              command: "webviewHandler.openAppHomePage",
              currDatabase,
              commandArgs: { appId: appItem.appId, pageId: "appHome", currDatabase, pageName: `[${appItem.appId as string}]应用管理`, appDir: appItem.dir },
              appDir: appItem.dir,
            },
            vscode.TreeItemCollapsibleState.Collapsed
          );
          for (const menuItem of ConstantsValue.appMenus) {
            newEntryItem.menuList.push(
              new EntryItem(
                {
                  label: menuItem.label,
                  value: menuItem.value,
                  appTitle: appItem.appTitle,
                  appId: appItem.appId,
                  type: menuItem.type,
                  command: menuItem.command,
                  currDatabase,
                  commandArgs: { appId: appItem.appId as string, pageId: menuItem.value, currDatabase, pageName: `[${appItem.appId as string}] ${menuItem.label}`, appDir: appItem.dir },
                },
                vscode.TreeItemCollapsibleState.Collapsed,
                newEntryItem
              )
            );
          }
          AppManager.handlerMap.set(appItem.appId as string, newEntryItem);
        }
      }
      return Array.from(AppManager.handlerMap.values());
    }
    return [];
  }
}
