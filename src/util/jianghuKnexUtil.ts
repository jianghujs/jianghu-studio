/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as dayjs from "dayjs";
import { Knex, knex } from "knex";
import * as _ from "lodash";
import { TableEnum } from "../common/constants";

async function backupNewDataListToRecordHistory({ ids, table, knexManager, requestBody, operation, operationByUserId, operationByUser, operationAt }: any): Promise<void> {
  if (_.isEmpty(ids)) {
    return;
  }
  const packageContent = JSON.stringify(requestBody);
  const newDataList = await knexManager(table).whereIn("id", ids).select();
  if (_.isEmpty(newDataList)) {
    return;
  }
  const recordHistoryList = newDataList.map((newData: { operation: any; operationByUserId: any; operationByUser: any; operationAt: any; id: any }) => {
    if (operation === "jhDelete") {
      newData.operation = operation;
      newData.operationByUserId = operationByUserId;
      newData.operationByUser = operationByUser;
      newData.operationAt = operationAt;
    }

    return {
      table,
      recordId: newData.id,
      recordContent: JSON.stringify(newData),
      packageContent,
      operation: newData.operation,
      operationByUserId: newData.operationByUserId,
      operationByUser: newData.operationByUser,
      operationAt: newData.operationAt,
    };
  });
  await knexManager(TableEnum._record_history).insert(recordHistoryList);
}

/**
 * 包装 knex，增加额外功能
 *
 * 使用: await this.app.jianghuKnex('_constant', this.ctx)
 .where({ constantKey: 'gender' })
 .update({ desc: '777' });
 * 使用: await await this.app.jianghuKnex.transaction(async trx => {
             // trx('table1').insert({ name: 'xx' });
             // trx('table2').insert({ name: 'xx' });
          })
 * @param knex
 */
function buildJianghuKnexFunc(knexManager: Knex) {
  return (table: string) => {
    let target: any = knexManager(table);
    const builder: any = {};
    // const userInfo: any = {};
    const request: any = {};
    // const { userInfo = {}, request = {} } = ctx;
    const requestBody = request.body || {};
    // const { userId: operationByUserId, username: operationByUser } = userInfo;
    const operationByUserId = "vscode";
    const operationByUser = "vscode";
    const operationAt = dayjs().format();

    // builder模式 ==> 代理knex相关api
    [
      "andWhere",
      "orWhere",
      "where",
      "whereNot",
      "whereIn",
      "whereNotIn",
      "whereNull",
      "whereNotNull",
      "whereExists",
      "whereNotExists",
      "whereBetween",
      "whereNotBetween",
      "whereRaw",
      "whereLike",
      "whereILike",
      "whereJsonObject",
      "whereJsonPath",
      "whereJsonSupersetOf",
      "whereJsonSubsetOf",
      "join",
      "innerJoin",
      "leftJoin",
      "leftOuterJoin",
      "rightJoin",
      "rightOuterJoin",
      "fullOuterJoin",
      "crossJoin",
      "joinRaw",
      "orderBy",
      "groupBy",
      "limit",
      "offset",
      "distinct",
      "distinctOn",
      "groupBy",
      "groupByRaw",
      "orderBy",
      "orderByRaw",
      "offset",
      "limit",
      "union",
      "unionAll",
      "onConflict",
      "returning",
      "increment",
      "noWait",
      "count",
      "min",
      "max",
      "sum",
      "avg",
      "increment",
      "decrement",
      "hintComment",
      "truncate",
      "pluck",
      "first",
      "clone",
      "rank",
      "denseRank",
      "rowNumber",
      "partitionBy",
      "modify",
      "columnInfo",
      "debug",
      "connection",
      "options",
    ].forEach(method => {
      builder[method] = (...args: any) => {
        target = target[method](...args);
        return builder;
      };
    });
    ["count", "first", "select", "delete"].forEach(method => {
      builder[method] = (...args: any) => target[method](...args);
    });
    // 自定义 insert、update、jhInsert、jhDelete、jhUpdate api
    builder.insert = (params: any) => {
      const operation = "insert";
      if (Array.isArray(params)) {
        params = params.map(item => ({
          ...item,
          operation,
          operationByUserId,
          operationByUser,
          operationAt,
        }));
      } else {
        params = {
          ...params,
          operation,
          operationByUserId,
          operationByUser,
          operationAt,
        };
      }
      return target.insert(params);
    };

    builder.update = (params: object) => {
      const operation = "update";
      return target.update({
        ...params,
        operation,
        operationByUserId,
        operationByUser,
        operationAt,
      });
    };

    builder.jhInsert = async (params: any) => {
      const operation = "jhInsert";
      if (Array.isArray(params)) {
        params = params.map(item => ({
          ...item,
          operation,
          operationByUserId,
          operationByUser,
          operationAt,
        }));
      } else {
        params = {
          ...params,
          operation,
          operationByUserId,
          operationByUser,
          operationAt,
        };
      }
      const ids = await target.insert(params);
      // 根据ids查询最新新数据 并 备份最新数据 到 _record_history
      // @ts-ignore
      await backupNewDataListToRecordHistory({
        ids,
        table,
        knexManager,
        requestBody,
        operation,
      });
      return ids;
    };

    builder.jhDelete = async () => {
      const operation = "jhDelete";

      // 获取要操作的ids
      const idsResult = await target.select("id");
      const ids = idsResult.map((item: { id: any }) => item.id);

      // 根据ids查询最新新数据 并 备份最新数据 到 _record_history; Tip: delete需要记录上一个版本的数据
      await backupNewDataListToRecordHistory({
        ids,
        table,
        knexManager,
        requestBody,
        operation,
        operationByUserId,
        operationByUser,
        operationAt,
      });

      // 执行操作
      const result = await target.delete();

      return result;
    };

    builder.jhUpdate = async (params: object) => {
      const operation = "jhUpdate";

      // 获取要操作的ids
      const idsResult = await target.select("id");
      const ids: any[] = idsResult.map((item: { id: any }) => item.id);

      // 执行操作
      const result = await knexManager(table)
        .whereIn("id", ids)
        .update({
          ...params,
          operation,
          operationByUserId,
          operationByUser,
          operationAt,
        });

      // 根据ids查询最新新数据 并 备份最新数据 到 _record_history
      // @ts-ignore
      await backupNewDataListToRecordHistory({
        ids,
        table,
        knexManager,
        requestBody,
        operation,
      });

      return result;
    };

    return builder;
  };
}

/**
 * 包装 knex
 * @param database
 */
export const createJianghuKnex = (database: Knex.MySqlConnectionConfig) => {
  const config: Knex.Config = {
    client: "mysql",
    connection: database,
    debug: true,
    log: {
      debug(msg) {
        console.log(msg.sql);
      },
    },
    pool: { min: 0, max: 100 },
    acquireConnectionTimeout: 30000,
  };
  const knexInstance: Knex = knex(config);
  const jianghuKnex: any = buildJianghuKnexFunc(knexInstance);
  jianghuKnex.raw = async (sql: string) => {
    const result = await knexInstance.raw(sql);
    return result;
  };

  jianghuKnex.transaction = async (callback: any) => {
    await knexInstance.transaction(async (trx: Knex<any, any[]>) => {
      const jianghuKnexTrx = buildJianghuKnexFunc(trx);
      await callback(jianghuKnexTrx);
    });
  };
  return jianghuKnex;
};
