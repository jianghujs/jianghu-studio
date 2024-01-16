// 处理 resource 相关
import { Knex } from "knex";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import { createJianghuKnex } from "../util/jianghuKnexUtil";

export default class JianghuKnexManager {
  private static handlerMap = new Map<string, Knex>();

  public static client(config: Knex.MySqlConnectionConfig) {
    const { host, port, database } = config;
    // host || "" ===> 这样写是为了 fix eslint的报错
    const key = `${host || ""}_${port || ""}_${database || ""}`;
    if (!JianghuKnexManager.handlerMap.has(key)) {
      JianghuKnexManager.handlerMap.set(key, createJianghuKnex(config) as Knex);
    }
    return JianghuKnexManager.handlerMap.get(key);
  }
}
