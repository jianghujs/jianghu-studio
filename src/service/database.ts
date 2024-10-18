/* eslint-disable @typescript-eslint/no-unsafe-call */

import { TableEnum } from "../common/constants";
import BaseService from "./base";

export default class DatabaseService extends BaseService {
  async getAllTables(ctx: any) {
    const result = await ctx.app.jianghuKnex.raw('SHOW TABLE STATUS');
    const tables = result[0].map((row: any) => ({
      tableName: row.Name,
      engine: row.Engine,
      rows: row.Rows,
      dataLength: row.Data_length,
      indexLength: row.Index_length,
      createTime: row.Create_time,
      updateTime: row.Update_time,
      comment: row.Comment
    }));

    return {
        rows: tables
    };
  }

  async getTableData(ctx: any) {
    const { tableName, page, pageSize } = ctx.request.body.appData.actionData;
    const offset = (page - 1) * pageSize;
    const result = await ctx.app.jianghuKnex(tableName)
      .select('*')
      .offset(offset)
      .limit(pageSize);
    const total = await ctx.app.jianghuKnex(tableName).count('* as count').first();
    return {
      rows: result,
      total: total.count,
    };
  }
}
