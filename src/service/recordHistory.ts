/* eslint-disable @typescript-eslint/no-unsafe-call */
import _ = require("lodash");
import * as dayjs from "dayjs";
import { BizError, ErrorInfo, TableEnum } from "../common/constants";
import { validateUtil } from "../util/validateUtil";
import BaseService from "./base";

const actionDataScheme = Object.freeze({
  selectUnDeleteItemListByTable: {
    type: "object",
    additionalProperties: true,
    required: ["table"],
    properties: {
      table: { type: "string" },
    },
  },
  selectDeleteItemListByTable: {
    type: "object",
    additionalProperties: true,
    required: ["table"],
    properties: {
      table: { type: "string" },
    },
  },
  restoreRecordByRecordHistory: {
    type: "object",
    additionalProperties: true,
    required: ["recordHistoryId"],
    properties: {
      recordHistoryId: { type: "number" },
    },
  },
});

export default class UserManagementService extends BaseService {
  /**
   * 获取使用中的数据列表
   */
  public async selectOnUseItemListByTable(ctx: any) {
    const actionData = ctx.request.body.appData.actionData;

    validateUtil.validate(actionDataScheme.selectUnDeleteItemListByTable, actionData);
    const { jianghuKnex, knex } = ctx.app;
    const { table } = actionData;
    const rows = await jianghuKnex(table)
      .orderBy([{ column: "operationAt", order: "desc" }])
      .select();

    const recordIdList = rows.map((row: { id: any }) => row.id);

    const recordIdCountList = await knex
      .count("recordId as count")
      .column("recordId", "table")
      .select()
      .from(TableEnum._record_history)
      .where({ table })
      .whereIn("recordId", recordIdList)
      .groupBy("recordId");
    const recordIdCountMap = _.keyBy(recordIdCountList, obj => obj.recordId);
    rows.forEach((row: { recordHistoryId?: any; count?: any; id?: any }) => {
      const { id: recordId } = row;
      const recordIdCount = recordIdCountMap[recordId] || { table, count: 0 };
      row.recordHistoryId = null;
      row.count = recordIdCount.count;
    });

    const count = rows.length;
    return { rows, count };
  }

  /**
   * 获取已删除的数据列表
   */
  public async selectDeletedItemListByTable(ctx: any) {
    const actionData = ctx.request.body.appData.actionData;
    validateUtil.validate(actionDataScheme.selectDeleteItemListByTable, actionData);
    const { jianghuKnex, logger } = ctx.app;
    const { table }: { table: string } = actionData;

    const selectMaxIdSql = `SELECT MAX(id) id, \`table\`, recordId, count(1) count 
                            FROM _record_history where \`table\` = '${table}' 
                            GROUP BY recordId;`;
    const maxIdItemListResult = await jianghuKnex.raw(selectMaxIdSql);
    const maxIdItemList = maxIdItemListResult[0];
    const recordIdMap = _.keyBy(maxIdItemList, obj => obj.recordId);
    const maxIdList = maxIdItemList.map((item: { id: any }) => item.id);

    const recordHistoryList = await jianghuKnex(TableEnum._record_history)
      .where({ operation: "jhDelete" })
      .whereIn("id", maxIdList)
      .orderBy([{ column: "id", order: "desc" }])
      .select();
    const recordList = recordHistoryList.map((recordHistory: { id: any; recordId: any; recordContent: any }) => {
      const { id: recordHistoryId, recordId, recordContent }: { recordContent: string; recordId: string; id: string } = recordHistory;
      let record: any = {};
      try {
        record = JSON.parse(recordContent);
      } catch (err) {
        logger.error("[selectDeleteItemListByTable]", "JSON.parse(row) error", err);
      }
      record.count = recordIdMap[recordId].count;
      record.recordHistoryId = recordHistoryId;
      return record;
    });

    const count = recordList.length;
    return { rows: recordList, count };
  }

  /**
   * 恢复数据
   */
  public async restoreRecordByRecordHistory(ctx: any) {
    const actionData = ctx.request.body.appData.actionData;
    validateUtil.validate(actionDataScheme.restoreRecordByRecordHistory, actionData);
    const { userId, username } = ctx.userInfo;
    const { jianghuKnex, knex } = ctx.app;
    const { recordHistoryId } = actionData;
    const recordHistory = await jianghuKnex(TableEnum._record_history).where({ id: recordHistoryId }).first();
    if (!recordHistory) {
      throw new BizError(ErrorInfo.data_exception);
    }

    const { table, recordId, recordContent }: any = recordHistory;
    const record = JSON.parse(recordContent as string);

    // Tip: jianghuKnex.insert 会覆盖 operation; 所以这里用knex
    await knex.transaction(async (trx: any) => {
      const operation = "jhRestore";
      const operationAt = dayjs().format();
      const operationByUserId = userId;
      const operationByUser = username;
      const newData = { ...record, operation, operationAt, operationByUserId, operationByUser };

      // restore 操作 也要衍生出一条 recordHistory
      await trx(TableEnum._record_history).insert({
        table,
        recordId: newData.id,
        recordContent: JSON.stringify(newData),
        packageContent: "{}",
        operation,
        operationAt,
        operationByUserId,
        operationByUser,
      });

      // 先查，然后 update/insert
      const recordListTemp = await trx(table).where({ id: recordId }).select();
      if (recordListTemp.length > 0) {
        await trx(table).where({ id: recordId }).update(newData);
      } else {
        await trx(table).insert(newData);
      }
    });
    return;
  }
}
