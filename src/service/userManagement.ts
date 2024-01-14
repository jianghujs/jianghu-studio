/* eslint-disable @typescript-eslint/no-unsafe-call */
import _ = require("lodash");
// eslint-disable-next-line import/no-internal-modules
import { Md5 } from "ts-md5";
import { BizError, ErrorInfo, TableEnum } from "../common/constants";
import { IdGenerateUtil } from "../util/idGenerateUtil";
import BaseService from "./base";

export default class UserManagementService extends BaseService {
  public async updateByList(ctx: any): Promise<void> {
    const { jianghuKnex } = ctx.app;
    const { data, pageId } = ctx.request.body.appData.actionData;
    const ids = [];
    for (const item of data) {
      if (item.pageId) {
        const params = {
          pageId: item.pageId,
          actionId: item.actionId,
          desc: item.desc,
          resourceType: item.resourceType,
          resourceData: item.resourceData,
          resourceHook: item.resourceHook,
        };
        if (item.id) {
          ids.push(item.id);
          await jianghuKnex(TableEnum._resource).where({ id: item.id }).update(params);
        } else {
          const insert = await jianghuKnex(TableEnum._resource).insert(params);
          ids.push(insert[0]);
        }
      }
    }
    if (ids.length) {
      await jianghuKnex(TableEnum._resource).where({ pageId }).whereNotIn("id", ids).delete();
    } else {
      await jianghuKnex(TableEnum._resource).where({ pageId }).delete();
    }
  }
  public async resetUserPassword(ctx: any): Promise<void> {
    const { jianghuKnex } = ctx.app;
    const actionData = ctx.request.body.appData.actionData;

    const { userId, clearTextPassword } = actionData;
    const userExistCountResult = await jianghuKnex(TableEnum._user).where({ userId }).count("*", { as: "count" });
    const userExistCount = userExistCountResult[0].count;
    if (userExistCount === 0) {
      throw new BizError(ErrorInfo.user_not_exist);
    }
    const md5Salt = IdGenerateUtil.randomString(12);
    const password = Md5.hashStr(`${clearTextPassword as string}_${md5Salt}`);
    await jianghuKnex(TableEnum._user).where({ userId }).update({ password, clearTextPassword, md5Salt });
  }
  public async addUser(ctx: any) {
    const { jianghuKnex } = ctx.app;
    const actionData = ctx.request.body.appData.actionData;

    const { clearTextPassword, userId } = actionData;
    const md5Salt = IdGenerateUtil.randomString(12);
    const password = Md5.hashStr(`${clearTextPassword as string}_${md5Salt}`);
    const idSequence = await this.getNextIdByTableAndField({ table: TableEnum._user, field: "idSequence", knex: jianghuKnex });
    const userExistCountResult = await jianghuKnex(TableEnum._user).where({ userId }).count("*", { as: "count" });
    const userExistCount = userExistCountResult[0].count;
    if (userExistCount > 0) {
      throw new BizError(ErrorInfo.user_id_exist);
    }
    const insertParams = _.pick(actionData, ["username", "contactNumber", "gender", "birthday", "signature", "email", "userType", "userStatus", "userAvatar"]);
    await jianghuKnex(TableEnum._user).insert({ ...insertParams, idSequence, userId, password, clearTextPassword, md5Salt });
    return {};
  }
  public async getNextIdByTableAndField({ table, field, knex }: any) {
    const rows = await knex(table).max(`${field as string} as maxValue`);
    let maxValue = null;
    if (rows.length > 0 && rows[0].maxValue) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      maxValue = parseInt(rows[0].maxValue, 10) + 1;
    } else {
      maxValue = 26260000;
    }
    return maxValue;
  }
}
