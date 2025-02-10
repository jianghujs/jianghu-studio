/* eslint-disable @typescript-eslint/no-unsafe-call */

import { TableEnum } from "../common/constants";
import BaseService from "./base";
import * as fs from "fs";

export default class DesignPageService extends BaseService {
  public async selectItem(ctx: any): Promise<void> {
    const { jianghuKnex } = ctx.app;
    const { file } = ctx.request.body.appData.actionData;

    // 读取文件内容
    const fileContent = fs.readFileSync(file, "utf-8").toString();
    console.log("fileContent", fileContent);
    // 文本转换成对象
    return { fileContent: eval(fileContent) };
  }
}
