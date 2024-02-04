import * as fs from "fs";
import * as path from "path";
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
    const { type, path: iPath, project } = item;
    if (["js", "script"].includes(type as string)) {
      return `<script src="${iPath as string}"></script>`;
    } else if (["css", "style"].includes(type as string)) {
      return `<link rel="stylesheet" href="${iPath as string}">`;
    } else if (["html", "component", "include"].includes(type as string)) {
      const res = fs.readFileSync(`${project as string}${iPath as string}`, "utf-8");
      return res;
    } else if (type === "vueComponent") {
      return `Vue.component('${item.name as string}', ${item.component as string})`;
    } else if (type === "vueUse") {
      return `Vue.use(${item.component as string})`;
    }
  },
};

// 一些 njk 的 filter
export default filters;
