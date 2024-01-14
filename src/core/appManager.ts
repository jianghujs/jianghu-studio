// 处理 resource 相关
import * as vscode from "vscode";
import { Constants, ConstantsValue } from "../common/constants";
import { EntryItem } from "../layout/tree/entryItem";

export default class AppManager {
  private static handlerMap: {
    [key: string]: EntryItem[];
  } = {};

  public static client(config: EntryItem): EntryItem[] {
    const { appId } = config;
    // host || "" ===> 这样写是为了 fix eslint的报错
    const key = appId;
    if (!key) {
      return [config];
    }
    if (JSON.stringify(AppManager.handlerMap) === "{}") {
      // @ts-ignore
      const workspaceConfig = vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX);
      const { list }: any = workspaceConfig.get("appList");
      for (const item of list || []) {
        const targetKey = item.appId;
        if (targetKey) {
          AppManager.handlerMap[targetKey] = new Array<EntryItem>();
          for (const menuItem of ConstantsValue.appMenus) {
            AppManager.handlerMap[targetKey].push(new EntryItem({ label: menuItem.label, menuId: menuItem.value, menuLabel: menuItem.label, type: "menu" }, vscode.TreeItemCollapsibleState.Collapsed));
          }
        }
      }
      return AppManager.handlerMap[key];
    } else {
      return AppManager.handlerMap[key];
    }
  }
}
