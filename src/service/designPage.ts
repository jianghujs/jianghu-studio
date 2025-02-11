/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable import/no-extraneous-dependencies */

import { TableEnum } from "../common/constants";
import BaseService from "./base";
import * as fs from "fs";
import * as prettier from "prettier";

export default class DesignPageService extends BaseService {
  public async selectItem(ctx: any): Promise<void> {
    const { file } = ctx.request.body.appData.actionData;

    // 读取文件内容
    const fileContent = fs.readFileSync(file, "utf-8").toString();
    console.log("fileContent", fileContent);
    // 文本转换成对象
    const content = eval(fileContent);
    const pageConfig = JSON.parse(
      JSON.stringify(
        content,
        (key, value) => {
          if (typeof value === "function") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return `__FUN__${value.toString()}__FUN__`;
          }
          if (value instanceof RegExp) {
            return `__FUN__${value.toString()}__FUN__`;
          }
          return value;
        },
        2
      )
    );
    // @ts-ignore
    return { fileContent: pageConfig };
  }

  public async updateItem(ctx: any): Promise<void> {
    const { fileContent, file }: { fileContent: any; file: string } = ctx.request.body.appData.actionData;
    console.log("prettier", prettier);
    // 重新格式化 & 保存
    const formatted = prettier.format(`module.exports = ${JSON.stringify(fileContent, null, 2)}`, {
      parser: "flow",
      printWidth: 180,
      semi: true,
      bracketSpacing: true,
      arrowParens: "avoid",
      useTabs: false,
      endOfLine: "auto",
      singleAttributePerLine: true,
      editorconfig: {
        max_line_length: 220,
      },
    });


    // 写入文件
    fs.writeFileSync(file, formatted);
    // @ts-ignore
    return { success: true };
  }
}
