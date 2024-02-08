import * as fs from "fs";
import * as vscode from "vscode";
import { PathUtil } from "../../util/pathUtil";
const tagAttr = (key: string, value: any, tag = "") => {
  // vuetify 的缩略标签
  const preList = [
    "x-small",
    "small",
    "medium",
    "large",
    "x-large",
    "disabled",
    "readonly",
    "active",
    "fixed",
    "absolute",
    "top",
    "bottom",
    "left",
    "right",
    "tile",
    "content",
    "inset",
    "dense",
    "single-line",
    "filled",
    "v-else",
  ];
  if (tag.startsWith("v-") && (preList.includes(key) || preList.includes(key.replace(":", ""))) && value === true) {
    return `${key}`.replace(/:/g, "");
  } else if (!(typeof value === "string") && !key.startsWith(":") && !key.startsWith("@")) {
    if (key === "v-else") {
      return `${key}`;
    }
    return `:${key}="${value as string}"`;
  }

  return `${key}="${(value as string).replace(/"/g, "'")}"`;
};
const tagItemFormat = (item: any) => {
  if (typeof item === "string") {
    return item;
  }
  if (!item.tag) {
    return "";
  }
  const tag = item.tag;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const attrs = Object.entries(item.attrs || {})
    .map(([key, value]) => tagAttr(key, value, tag as string))
    .join(" ");
  let value = "";

  if (typeof item.value === "string") {
    value = item.value;
  } else if (Array.isArray(item.value)) {
    if (!item.value.length) {
      value = "";
    } else if (item.value.length === 1 && typeof item.value[0] === "string") {
      value = item.value[0];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      value = item.value.map((subItem: any) => tagItemFormat(subItem)).join("\n");
    }
  } else if (typeof item.value === "object") {
    value = tagItemFormat(item.value);
  }

  const uid = item.uid;

  const indentSpaces = "";
  const lineBreak = value ? "\n" : "";
  return `${indentSpaces}<${tag as string} ${attrs} ${uid ? `uid="${uid as string}"` : ""}">${lineBreak}${value}${lineBreak}${value ? indentSpaces : ""}</${tag as string}>`;
};
const filters: { [key: string]: (...args: any[]) => any } = {
  shorten(str: string, count: number): string {
    return str.slice(0, count || 5);
  },
  stringToVar(str: string): string {
    return str.substring(0, str.length - 1);
  },
  variableToVar(obj: string, k: string): string {
    if (!obj) {
      return "";
    }
    const testKey: any[] = [];
    let content: string;
    if (typeof obj !== "boolean" && typeof obj !== "string") {
      content = JSON.stringify(
        obj,
        (key, value) => {
          if (typeof value === "function") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            let valStr: string = value.toString();
            // 匹配 String Object 等函数原样输出
            const reg = /function ([A-Z][a-z]+)\(\) \{ \[native code\] \}/;
            if (reg.test(valStr)) {
              valStr = valStr.replace(reg, "$1");
            }
            if (key && valStr.startsWith(key)) {
              valStr = "replace_this_key" + valStr;
              testKey.push(key);
            }
            return `__FUNC_START__${valStr}__FUNC_END__`;
          }
          return value;
        },
        2
      )
        .replace(/"__FUNC_START__/g, "")
        .replace(/__FUNC_END__"/g, "")
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n {4}/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\\(?!n)/g, "")
        .replace(/\n/g, "\n");
    } else {
      content = obj;
    }
    testKey.forEach(key => {
      content = content.replace(new RegExp(`"${key as string}":\\s*?replace_this_key`, "g"), "");
    });
    if (k) {
      // 匿名同步格式
      if (/^function\s*?\(/.test(content) || /^\(/.test(content)) {
        content = k + ": " + content;
      }
      // 匿名异步格式
      if (/^async\s+function\s*?\(/.test(content) || /^async\s+\(/.test(content)) {
        content = k + ": " + content;
      }
      if (typeof obj === "object") {
        content = `"${k}": ` + content;
      }
      if (typeof obj === "boolean") {
        content = `"${k}": ` + content;
      }
      if (typeof obj === "string") {
        content = `"${k}": '` + content.replace(/"/g, "'") + "'"; // 字符串需要加引号
      }
      if (typeof obj === "number") {
        content = k + ": " + content; // 字符串需要加引号
      }
    }
    content = content.replace(/"(\w+)":/g, "$1:");
    content = content.replace(/"__FUN__\(/gm, "").replace(/\)__FUN__"/gm, "");
    return content.substring(1, content.length - 1);
  },
  tagFormat(result) {
    const tag = [];
    if (Array.isArray(result)) {
      result.forEach(res => {
        tag.push(tagItemFormat(res).replace(/^\s+/, ""));
      });
    } else if (typeof result === "object") {
      tag.push(tagItemFormat(result).replace(/^\s+/, ""));
    } else if (typeof result === "string") {
      tag.push(result);
    }
    return tag.join("\n");
  },
  doUiActionFormat(codeStr: any) {
    let codeString = "";
    // eslint-disable-next-line guard-for-in
    for (const key in codeStr) {
      codeString += `\ncase "${key}": \n`;
      (codeStr[key] as string[]).forEach((item: string) => {
        codeString += `await this.${item}(uiActionData);\n`;
      });
      codeString += "break;\n";
    }
    return codeString;
  },
  methodFormat(obj) {
    // eslint-disable-next-line guard-for-in
    let codeString = "";
    // eslint-disable-next-line guard-for-in
    for (const key in obj) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      codeString += `${(obj[key] as string).toString()},\n`;
    }
    return codeString;
  },
  createdString(value) {
    console.log("createdString", value);
    return value;
  },
  // 废弃了，不用了
  actionFormat(result) {
    const tag = [];
    if (Array.isArray(result)) {
      result.forEach(res => {
        tag.push(tagItemFormat(res).replace(/^\s+/, ""));
      });
    } else if (typeof result === "object") {
      if (result.tag === "v-navigation-drawer") {
        (result.value as any[]).forEach((item: any) => {
          tag.push(tagItemFormat(item).replace(/^\s+/, ""));
        });
      } else {
        tag.push(tagItemFormat(result).replace(/^\s+/, ""));
      }
    } else if (typeof result === "string") {
      tag.push(result);
    }
    return tag.join("\n");
  },
  includeListFormat(item) {
    if (!item) {
      return "";
    }
    if (typeof item === "string") {
      return item; // 兼容原生代码
    }
    const { type, path: iPath } = item;
    if (["js", "script"].includes(type as string)) {
      return `<script src="${iPath as string}"></script>`;
    } else if (["css", "style"].includes(type as string)) {
      return `<link rel="stylesheet" href="${iPath as string}">`;
    } else if (["html", "component", "include"].includes(type as string)) {
      let project: string | undefined;
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return "";
      }
      if (fs.existsSync(`${PathUtil.extensionContext.extensionPath}/src/view/${iPath as string}`)) {
        project = `${PathUtil.extensionContext.extensionPath}/src/view/`;
      } else if (fs.existsSync(`${PathUtil.getProjectPath(editor.document)}/app/view/${iPath as string}`)) {
        project = `${PathUtil.getProjectPath(editor.document)}/app/view/`;
      }
      const res = fs.readFileSync(`${project as string}${iPath as string}`, "utf-8");
      return res;
    } else if (type === "vueComponent") {
      return `Vue.component('${item.name as string}', ${item.component as string})`;
    } else if (type === "vueUse") {
      return `Vue.use(${item.component as string})`;
    }
  },
  eventStepFormat(value: any) {
    if (!value) {
      return "";
    }
    const values: any[] = [];
    const eventNames = new Map(
      Object.entries({
        getTableData: "刷新数据",
        startCreateItem: "新增数据",
        startUpdateItem: "编辑数据",
        createItem: "创建数据",
        updateItem: "更新数据",
        deleteItem: "删除数据",
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Object.keys(value).forEach((key: string) => {
      values.push({ text: eventNames.has(key) ? eventNames.get(key) : key, value: key });
    });
    return values.map(item => JSON.stringify(item)).join(",");
  },
};

// 一些 njk 的 filter
export default filters;
