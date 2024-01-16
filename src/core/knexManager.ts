// 处理 resource 相关
import { Knex, knex } from "knex";
import * as vscode from "vscode";
import { Constants } from "../common/constants";

export default class KnexManager {
  private static handlerMap = new Map<string, Knex>();

  public static client(config: Knex.MySqlConnectionConfig) {
    const { host, port, database } = config;
    // host || "" ===> 这样写是为了 fix eslint的报错
    const key = `${host || ""}_${port || ""}_${database || ""}`;
    if (!KnexManager.handlerMap.has(key)) {
      const dbConfig: Knex.Config = {
        client: "mysql",
        connection: config,
      };
      KnexManager.handlerMap.set(key, knex(dbConfig));
    }
    return KnexManager.handlerMap.get(key);
  }
}
