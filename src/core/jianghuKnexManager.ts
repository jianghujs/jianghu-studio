// 处理 resource 相关
import { Knex } from "knex";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { createJianghuKnex } from "../util/jianghuKnexUtil";

export default class JianghuKnexManager {
  private static handlerMap: {
    [key: string]: [value: Knex];
  } = {};

  public static client(config: Knex.MySqlConnectionConfig) {
    const { host, port, database } = config;
    // host || "" ===> 这样写是为了 fix eslint的报错
    const key = `${host || ""}_${port || ""}_${database || ""}`;
    if (JSON.stringify(JianghuKnexManager.handlerMap) === "{}") {
      // @ts-ignore
      const { list }: { list: [Knex.MySqlConnectionConfig] } = vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX).get("databaseList");
      for (const item of list || []) {
        const targetKey = `${item.host as string}_${item.port as number}_${item.database as string}`;
        JianghuKnexManager.handlerMap[targetKey] = createJianghuKnex(item);
      }
      return JianghuKnexManager.handlerMap[key];
    } else {
      return JianghuKnexManager.handlerMap[key];
    }
  }
}
