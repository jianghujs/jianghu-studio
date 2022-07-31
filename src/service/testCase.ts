/*
 * @Author: case 7795958+lipangpang251@user.noreply.gitee.com
 * @Date: 2022-06-10 22:23:19
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2022-06-11 20:50:21
 * @FilePath: \framework\src\service\testCase.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { TableEnum } from "../common/constants";
import BaseService from "./base";

export default class TestCaseService extends BaseService {
  public async alertTable(ctx: any) {
    const { knex } = ctx.app;
    const exists = await knex.schema.hasTable("_test_case");
    if (!exists) {
      await knex.schema.raw(`
      CREATE TABLE \`_test_case\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`pageId\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '页面Id',
        \`testId\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '测试用例Id; 10000 ++',
        \`testName\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '测试用例名',
        \`uiActionIdList\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'uiAction列表; 一个测试用例对应多个uiActionId',
        \`testOpeartion\` text COLLATE utf8mb4_bin COMMENT '测试用例步骤;',
        \`operation\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作; jhInsert, jhUpdate, jhDelete jhRestore',
        \`operationByUserId\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作者userId; recordContent.operationByUserId',
        \`operationByUser\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作者用户名; recordContent.operationByUser',
        \`operationAt\` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作时间; recordContent.operationAt; E.g: 2021-05-28T10:24:54+08:00 ',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='测试用例表';`);
    }
  }
  public async updateByList(ctx: any): Promise<void> {
    const { jianghuKnex } = ctx.app;
    const { data: itemList, pageId } = ctx.request.body.appData.actionData;

    const ids = [];
    for (const item of itemList) {
      if (item.pageId) {
        const data = {
          pageId: item.pageId,
          testId: item.testId,
          testName: item.testName,
          testOpeartion: item.testOpeartion,
        };
        if (item.id) {
          ids.push(item.id);
          await jianghuKnex(TableEnum._test_case).where({ id: item.id }).update(data);
        } else {
          const insert = await jianghuKnex(TableEnum._test_case).insert(data);
          ids.push(insert[0]);
        }
      }
    }
    if (ids.length) {
      await jianghuKnex(TableEnum._test_case).where({ pageId }).whereNotIn("id", ids).delete();
    } else {
      await jianghuKnex(TableEnum._test_case).where({ pageId }).delete();
    }
  }
}
