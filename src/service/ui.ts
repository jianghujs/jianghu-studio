/* eslint-disable @typescript-eslint/no-unsafe-call */

import { TableEnum } from "../common/constants";
import BaseService from "./base";

export default class UiService extends BaseService {
  public async updateByList(ctx: any): Promise<void> {
    const { jianghuKnex } = ctx.app;
    const { data: itemList, pageId } = ctx.request.body.appData.actionData;

    const ids = [];
    for (const item of itemList) {
      if (item.pageId) {
        const data = {
          pageId: item.pageId,
          uiActionId: item.uiActionId,
          uiActionType: item.uiActionType,
          desc: item.desc,
          uiActionConfig: item.uiActionConfig,
        };
        if (item.id) {
          ids.push(item.id);
          await jianghuKnex(TableEnum._ui).where({ id: item.id }).update(data);
        } else {
          const insert = await jianghuKnex(TableEnum._ui).insert(data);
          ids.push(insert[0]);
        }
      }
    }
    if (ids.length) {
      await jianghuKnex(TableEnum._ui).where({ pageId }).whereNotIn("id", ids).delete();
    } else {
      await jianghuKnex(TableEnum._ui).where({ pageId }).delete();
    }
  }
}
