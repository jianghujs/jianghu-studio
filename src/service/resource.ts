/* eslint-disable @typescript-eslint/no-unsafe-call */
import { TableEnum } from "../common/constants";
import BaseService from "./base";

export default class ResourceService extends BaseService {
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
          resourceHook: item.resourceHook || null,
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
}
