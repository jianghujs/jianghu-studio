// 处理 resource 相关
import { Knex, knex } from "knex";
import * as vscode from "vscode";
import { Constants } from "../common/constants";

export default class KnexManager {
  private static handlerMap: {
    [key: string]: [value: Knex];
  } = {};

  public static client(config: Knex.MySqlConnectionConfig) {
    const { host, port, database } = config;
    // host || "" ===> 这样写是为了 fix eslint的报错
    const key = `${host || ""}_${port || ""}_${database || ""}`;
    if (JSON.stringify(KnexManager.handlerMap) === "{}") {
      // @ts-ignore
      const { list }: { list: [Knex.MySqlConnectionConfig] } = vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX).get("databaseList");
      for (const item of list || []) {
        const targetKey = `${item.host as string}_${item.port as number}_${item.database as string}`;

        const dbConfig: Knex.Config = {
          client: "mysql",
          connection: item,
        };
        const knexInstance: any = knex(dbConfig);
        KnexManager.handlerMap[targetKey] = knexInstance;
      }
      return KnexManager.handlerMap[key];
    } else {
      return KnexManager.handlerMap[key];
    }
  }
}
