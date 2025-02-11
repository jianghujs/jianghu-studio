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
            return `__FUNSTART__${value.toString()}__FUNEND__`;
          }
          if (value instanceof RegExp) {
            return `__FUNSTART__${value.toString()}__FUNEND__`;
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

    let configContent = JSON.stringify(fileContent, 
      (key, value) => {
        if (typeof value === "string" && !value.startsWith("__FUNSTART__") && /\n/.test(value)) {
          if (key === "style") {
            return (
              "=/*css*/`" +
              value
                .replace(/^"|"$/g, "") // 去掉头尾的双引号
                .replace(/\\/g, "\\") // 先确保反斜杠本身不会重复
                .replace(/`/g, "\\`")
                .replace(/\n/g, "\n") +
              "`="
            );
          }
          return (
            "=/*html*/`" +
            value
              .replace(/^"|"$/g, "") // 去掉头尾的双引号
              .replace(/\\/g, "\\") // 先确保反斜杠本身不会重复
              .replace(/`/g, "\\`")
              .replace(/\$\{/g, "$\\{")
              .replace(/\n/g, "\n") +
            "`="
          );
        }
        return value;
      }, 2)
      .replace(/"=\/\*css\*\/`/g, "/*css*/`")
      .replace(/"=\/\*html\*\/`/g, "/*html*/`")
      .replace(/"=`|`="/g, "`")
      .replace(/"__FUNSTART__(.*?)__FUNEND__"/g, (match: any, p1: any) => p1.replace(/\\"/g, '"'))
    configContent = configContent
      .replace(/\\\\`/g, "\\`")
      .replace(/"\s*([^"]+)":\s*(async\s+)?\1\(([^)]*)\)/g, "$2$1($3)")
      .replace(/(\w+)=\\\\"([^"]*)\\\\"/g, '$1="$2"')
      .replace(/(\w+)=\\"([^"]*)\\"/g, '$1="$2"')
      .replace(/(?<!\\)\\n/g, "\n")
      .replace(/\\\\/g, "\\")
      .replace(/:\s+/g, ": ") // 在冒号后添加空格
      .replace(/,\s+/g, ", "); // 在逗号后添加空格
    // 重新格式化 & 保存
    try {
      const formatted = prettier.format(`module.exports = ${configContent}`, {
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
      return fs.writeFileSync(file, formatted);
    } catch (error) {
      console.log("error", error);
      // @ts-ignore
      return error;
    }
  }
}
