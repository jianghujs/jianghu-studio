/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable import/no-extraneous-dependencies */

import { TableEnum } from "../common/constants";
import BaseService from "./base";
import * as fs from "fs";
import * as prettier from "prettier";
import * as JSON5 from "json5";
export default class DesignPageService extends BaseService {
  public async selectItem(ctx: any): Promise<void> {
    const { file } = ctx.request.body.appData.actionData;

    // 读取文件内容
    const fileContent = fs.readFileSync(file, "utf-8").toString();
    console.log("fileContent", fileContent);
    // 文本转换成对象
    const content = eval(fileContent);

    const contentStr = JSON.stringify(
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
    );
    // 检查补全默认属性
    this.checkDefaultAttrs(content);
    // // title:{key} "title" 替换成 ?key: "title";
    const pageConfig = JSON.parse(contentStr);
    // @ts-ignore
    return { fileContent: pageConfig };
  }

  // 检查补全默认属性
  private checkDefaultAttrs(content: any) {
    // 检查补全默认属性
    const defaultAttrs = {
      version: "",
      jhMenu: true,
      template: "jhTemplateV4",
      includeList: [],
      resourceList: [],
      headContent: [],
      pageContent: [],
      actionContent: [],
      style: "",
      _metadata: {},
    };
    // 检查补全默认属性
    Object.keys(defaultAttrs).forEach(key => {
      if (!(key in content)) {
        content[key] = defaultAttrs[key];
      }
    });
  }

  /**
   * 更新页面配置
   * @param ctx
   * @returns
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  public async updateItem(ctx: any): Promise<void> {
    const { fileContent, file }: { fileContent: any; file: string } = ctx.request.body.appData.actionData;
    console.log("prettier", prettier);

    let configContent = JSON.stringify(
      fileContent,
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
      },
      2
    )
      .replace(/"=\/\*css\*\/`/g, "/*css*/`")
      .replace(/"=\/\*html\*\/`/g, "/*html*/`")
      .replace(/"=`|`="/g, "`")
      .replace(/"__FUNSTART__(.*?)__FUNEND__"/g, (match: any, p1: any) => p1.replace(/\\"/g, '"'));
    configContent = configContent
      .replace(/\\\\`/g, "\\`")
      .replace(/"\s*([^"]+)":\s*(async\s+)?\1\(([^)]*)\)/g, "$2$1($3)")
      .replace(/(\w+)=\\\\"([^"]*)\\\\"/g, '$1="$2"')
      .replace(/(\w+)=\\"([^"]*)\\"/g, '$1="$2"')
      .replace(/(?<!\\)\\n/g, "\n")
      .replace(/\\\\/g, "\\")
      .replace(/:\s+/g, ": ") // 在冒号后添加空格
      .replace(/,\s+/g, ", "); // 在逗号后添加空格

    // 注释
    const commentMap: Record<string, string> = {
      jhMenu: "是否隐藏菜单",
      common: "公共配置",
      includeList: "{ type: < js | css | html | vueComponent >, path: ''}",
      resourceList: "{ actionId: '', resourceType: '', resourceData: {}, resourceHook: {}, desc: '' }",
    };
    // 在这些顶层key 上方增加注释
    Object.keys(commentMap).forEach(key => {
      configContent = configContent.replace(`"${key}":`, `\n// ${commentMap[key]}\n"${key}":`);
    });

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
