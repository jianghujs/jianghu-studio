/* eslint-disable import/no-extraneous-dependencies */
import * as vscode from "vscode";
import { JhPanel } from "./JhPanel";
import { PathUtil } from "../util/pathUtil";
import AppManager from "../core/appManager";
import * as fs from "fs";
import * as dayjs from "dayjs";
// eslint-disable-next-line import/no-extraneous-dependencies
import * as cheerio from "cheerio";
// eslint-disable-next-line import/no-extraneous-dependencies
import { ElementType } from "domelementtype";
import { EntryItem } from "../layout/tree/entryItem";
import { Knex } from "knex";
import JianghuKnexManager from "../core/jianghuKnexManager";
import { sqlResource } from "../util/resourceUtil";
// eslint-disable-next-line import/no-extraneous-dependencies
import * as parser from "@babel/parser";
// @ts-ignore
import traverse from "@babel/traverse";
// @ts-ignore
import generate from "@babel/generator";
// @ts-ignore
// eslint-disable-next-line import/no-extraneous-dependencies
import * as prettier from "prettier";

export class JhPanelUserJson extends JhPanel {
  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.init();
  }

  private init() {
    // 可视化使用 json 方法入口
    this.context.subscriptions.push(
      vscode.commands.registerCommand("jhExtension.openPageDesignFromJson", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const panelId = dayjs().format();
        const projectPath: string = PathUtil.getProjectPath(editor.document);
        const extensionPath: string = this.context.extensionPath;
        const { appId } = PathUtil.getConfigJson(`${projectPath}/config/config.default.js`);
        const currDatabase: Map<string, EntryItem> = AppManager.handlerMap.get(appId as string)?.currDatabase;
        const webPageId = editor.document.uri.path.split("/").pop()?.split(".")[0] as string;

        const document = editor.document;
        let sourceCode = document.getText();
        // sourceCode 需要格式化，否则读取就不准；但目前格式化后 include 会被折行，需要再处理
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
        sourceCode = prettier.format(sourceCode, { parser: "html" });
        const sourceCodeLines = sourceCode.split("\n");
        const htmlStartIndex = sourceCodeLines.findIndex(line => line.includes('<v-app mobile-breakpoint="sm">'));
        const htmlEndIndex = sourceCodeLines.findIndex(line => line.includes("</v-app>"));
        const vueTemplatePattern = sourceCodeLines.slice(htmlStartIndex, htmlEndIndex + 1).join("\n");
        const vueStartIndex = sourceCodeLines.findIndex(line => line.includes("new Vue({"));
        const vueScriptPattern = sourceCodeLines.slice(vueStartIndex).join("\n").split("</script>")[0];
        const otherLines = sourceCodeLines.slice(vueStartIndex + vueScriptPattern.split("\n").length);
        const styleStartIndex = otherLines.findIndex(line => line.includes("<style"));
        const styleEndIndex = otherLines.findIndex(line => line.includes("</style>"));
        const vueStylePattern = otherLines.slice(styleStartIndex + 1, styleEndIndex).join("\n");
        // console.log("vueTemplatePattern", vueTemplatePattern);
        // console.log("vueScriptPattern", vueScriptPattern);
        // console.log("vueStylePattern", vueStylePattern);
        // 先用 json空白模板覆盖掉原有 json
        const pageJson: string = this.buildJsonTemplate(extensionPath, projectPath, webPageId);
        void import(pageJson).then((pageConfig: any) => {
          // 弹出loading的提示
          void vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "正在同步页面配置到json中",
              cancellable: false,
            },
            async (progress, _token) => {
              progress.report({ increment: 0 });
              const htmlCheerio = cheerio.load(vueTemplatePattern);
              // 从数据库中提取页面信息和 resourceList
              await this.initPageInfo(pageConfig, currDatabase, appId as string, webPageId);
              progress.report({ increment: 10 });
              // 0. 从代码中提取到 头部信息
              this.matchHeadContent(pageConfig, htmlCheerio);
              progress.report({ increment: 20 });
              // 1. 从代码中提取到 表格 v-data-table 以及关联的 data 和 uiAction、method
              this.matchDataTable(pageConfig, htmlCheerio);
              progress.report({ increment: 30 });
              // 2. 从代码中提取到 抽屉 v-drawer 以及关联的 data 和 uiAction、method
              this.matchDrawer(pageConfig, htmlCheerio);
              progress.report({ increment: 40 });
              this.matchDoUiAction(pageConfig, vueScriptPattern);
              progress.report({ increment: 50 });
              this.matchIncludes(pageConfig, sourceCode);
              progress.report({ increment: 60 });
              console.log("pageConfig", pageConfig);
              const pageConfigJson = `const content = ${JSON.stringify(pageConfig, null, 2)};\n\n module.exports = content;`;
              fs.writeFileSync(pageJson, pageConfigJson);
              // fs直接写入覆盖
              let newJsonText = fs.readFileSync(pageJson, "utf-8");
              // newJsonText = this.matchData(vueScriptPattern, newJsonText);
              progress.report({ increment: 70 });
              newJsonText = this.matchMethodsWatch(vueScriptPattern, newJsonText);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              newJsonText = prettier.format(newJsonText, { parser: "babel" });
              fs.writeFileSync(pageJson, newJsonText);
              // 弹出提示
              progress.report({ increment: 100 });
              void vscode.window.showInformationMessage("页面配置已经同步到json中");
              // 打开设计页面
              this.openPageDesignFromJson(editor, panelId, pageJson);
            }
          );
        });
      })
    );
  }
  private matchIncludes(pageConfig: any, sourceCode: string) {
    const regex = /{% include\s*["']([\s\S]*?)["'] %}/gs;
    const matches = sourceCode.match(regex);
    pageConfig.includeList = [];
    if (matches) {
      matches.forEach(match => {
        const path = match.match(/["']([\s\S]*?)["']/);
        if (path) {
          const pathStr = path[1].trim();
          if (path) {
            (pageConfig.includeList as any[]).push({
              type: "include",
              path: pathStr,
            });
          }
        }
      });
    }
  }
  private matchMethodsWatch(vueScriptPattern: string, newJsonText: string): string {
    const ast = parser.parse(vueScriptPattern, {
      sourceType: "module",
      plugins: ["typescript", "asyncGenerators", "classProperties", "dynamicImport", "objectRestSpread"],
    });

    const datas: string[] = [];
    const watchs: string[] = [];
    const methods: string[] = [];
    const computeds: string[] = [];
    const createdLines: string[] = [];
    const mountedLines: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    traverse(ast, {
      ObjectMethod(path: any) {
        // console.log("ObjectMethod", path.node.key.name);
        if (path.node.key.name === "created" || path.node.key.name === "mounted") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const body = path.node.body.body;
          (body as any[]).forEach(statement => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            const { code } = generate(statement);
            if (path.node.key.name === "created") {
              createdLines.push(code as string);
            } else {
              mountedLines.push(code as string);
            }
          });
        }
      },
      ObjectProperty(path: any) {
        // console.log("ObjectProperty", path.node.key.name);
        if (path.node.key.name === "data") {
          console.log("data", path.node);
          if (path.node.value.body) {
            (path.node.value.body.properties as any[]).forEach(property => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              const { code } = generate(property, {});
              if (!(code as string).includes("isHelpPageDrawerShown") && !(code as string).includes("isHelpPageDrawerLoaded")) {
                datas.push(code as string);
              }
            });
          }
        }
        if (path.node.key.name === "methods") {
          (path.node.value.properties as any[]).forEach(property => {
            if (property.type === "ObjectMethod") {
              // isHelpPageDrawerShown 是预定的 watch，不需要提取
              if (property.key.name !== "doUiAction") {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                const { code } = generate(property, {});
                methods.push(code as string);
              }
            }
          });
        }
        if (path.node.key.name === "watch") {
          (path.node.value.properties as any[]).forEach(property => {
            if (property.type === "ObjectMethod") {
              // isHelpPageDrawerShown 是预定的 watch，不需要提取
              if (property.key.name !== "isHelpPageDrawerShown") {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                const { code } = generate(property, {});
                watchs.push(code as string);
              }
            }
          });
        }
        if (path.node.key.name === "computed") {
          (path.node.value.properties as any[]).forEach(property => {
            if (property.type === "ObjectMethod") {
              // isHelpPageDrawerShown 是预定的 watch，不需要提取
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              const { code } = generate(property, {});
              computeds.push(code as string);
            }
          });
        }
      },
    });
    newJsonText = newJsonText.replace('"<<!DATA!>>"', `{\n${datas.join(",\n")}\n}`);
    newJsonText = newJsonText.replace('"<<!CREATED!>>"', `\`${createdLines.join("\n")}\``);
    newJsonText = newJsonText.replace('"<<!MOUNTED!>>"', `\`${mountedLines.join("\n")}\``);
    newJsonText = newJsonText.replace('"<<!COMPUTED!>>"', `{\n${computeds.join(",\n")}\n}`);
    newJsonText = newJsonText.replace('"<<!WATCH!>>"', `{\n${watchs.join(",\n")}\n}`);
    newJsonText = newJsonText.replace('"<<!METHODS!>>"', `{\n${methods.join(",\n")}\n}`);
    return newJsonText;
  }
  private matchDoUiAction(pageConfig: any, vueScriptPattern: string) {
    const doUiActionObj = {};
    let caseName = "";
    let functionList = [];
    vueScriptPattern.replace(/case ['"](.*?)['"]:([\s\S]*?)break;/g, (_, caseStr, functionStr): any => {
      caseName = caseStr;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      functionList = functionStr.match(/this\.(.*?)\(/g).map((func: any) => func.slice(5, -1));
      (doUiActionObj as any)[caseName] = functionList;
    });

    pageConfig.common.doUiAction = doUiActionObj;
  }

  private async initPageInfo(pageConfig: any, currDatabase: Map<string, EntryItem>, appId: string, webPageId: string) {
    pageConfig.pageId = webPageId;
    pageConfig.table = webPageId;
    const jianghuKnex: Knex<any, any[]> | undefined = JianghuKnexManager.client(currDatabase as Knex.MySqlConnectionConfig);
    if (jianghuKnex) {
      const resourceList = await sqlResource({
        jianghuKnex,
        appData: {
          where: {
            pageId: webPageId,
          },
        },
        resourceData: { table: "_resource", operation: "select" },
      });
      pageConfig.resourceList = resourceList.rows;
    }
  }

  private matchDrawer(pageConfig: any, htmlCheerio: cheerio.CheerioAPI) {
    const $ = htmlCheerio;
    const drawerContainer = $(`v-main`).children();
    if (!drawerContainer) {
      return;
    }
    pageConfig.actionContent = [];
    drawerContainer.map((_index, item) => {
      if ($(item).hasClass("jh-page-second-bar")) {
        return;
      }
      if ($(item).hasClass("jh-page-body-container")) {
        return;
      }
      if ($(item).attr("v-model") === "isHelpPageDrawerShown") {
        return;
      }
      this.loopFindChildren($(item), pageConfig.actionContent as any[], htmlCheerio);
    });
  }

  private matchDataTable(pageConfig: any, cApi: cheerio.CheerioAPI) {
    const $ = cApi;
    const bodyContainer = $(`div.jh-page-body-container > v-card`);
    if (!bodyContainer) {
      return;
    }
    pageConfig.pageContent = [];
    this.loopFindChildren(bodyContainer, pageConfig.pageContent as any[], cApi);
  }

  // 头部信息提取到 json中
  private matchHeadContent(pageConfig: any, cApi: cheerio.CheerioAPI) {
    const $ = cApi;
    const bodyContainer = $(`div.jh-page-second-bar`);
    if (!bodyContainer) {
      return;
    }
    pageConfig.headContentStudio = [];
    this.loopFindChildren(bodyContainer, pageConfig.headContentStudio as any[], cApi);
    pageConfig.hasHelpDrawer = $(bodyContainer).html()?.includes("isHelpPageDrawerShown = true");
  }

  private loopFindChildren(dom: cheerio.Cheerio<cheerio.Element>, parent: any[], cApi: cheerio.CheerioAPI) {
    const $ = cApi;
    // vscode.window.showInformationMessage(`正在提取Html标签: ${((dom[0] as any).name as string) || "template"}`);
    console.log("正在提取Html标签", (dom[0] as any).name || "template");
    if ((dom[0] as any).type === ElementType.Text) {
      const text = $(dom).text().trim();
      if (text && text.length) {
        parent.push(text);
      }
    }
    if ((dom[0] as any).type === ElementType.Root) {
      dom.contents().map((_index, item: cheerio.AnyNode) => {
        this.loopFindChildren($(item as cheerio.Element), parent, cApi);
      });
    }
    if ((dom[0] as any).type === ElementType.Tag) {
      const pageItem = {
        tag: (dom[0] as any).name,
        attrs: {} as Record<string, any>,
        value: [],
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Object.keys($(dom).attr() as any).map(key => {
        pageItem.attrs[key] = $(dom).attr(key) === "" ? true : $(dom).attr(key);
      });
      dom.contents().map((_index, item: cheerio.AnyNode) => {
        this.loopFindChildren($(item as cheerio.Element), pageItem.value, cApi);
      });
      parent.push(pageItem);
    }
  }

  // 用空白 json 替换现在的 json
  // 如果没保存就关闭了可视化设计。记得还原备份的 json
  private buildJsonTemplate(extensionPath: string, projectPath: string, webPageId: string): string {
    const projectJson = `${projectPath}/app/view/init-json/page/${webPageId}.js`;
    if (fs.existsSync(projectJson)) {
      // 备份下
      // fs.copyFileSync(projectJson, `${projectJson}.${dayjs().format()}.bak`);
      fs.unlinkSync(projectJson);
    }

    const jsonTemplate = `${extensionPath}/src/view/template/exampleClass.js`;
    if (!fs.existsSync(`${projectPath}/app/view/init-json/`)) {
      fs.mkdirSync(`${projectPath}/app/view/init-json/`);
    }
    if (!fs.existsSync(`${projectPath}/app/view/init-json/page/`)) {
      fs.mkdirSync(`${projectPath}/app/view/init-json/page/`);
    }
    fs.copyFileSync(jsonTemplate, projectJson);
    return projectJson;
  }

  private openPageDesignFromJson(editor: vscode.TextEditor, panelId: string, jsonPath: string) {
    const projectPath = PathUtil.getProjectPath(editor?.document);
    const activeFile = editor?.document.uri.path;
    const webPageId = activeFile.split("/").pop()?.split(".")[0] as string;
    const { appId } = PathUtil.getConfigJson(`${projectPath}/config/config.default.js`);
    const currDatabase = AppManager.handlerMap.get(appId as string)?.currDatabase;
    const newJsonPath = `${projectPath}/app/view/init-json/page-temp/${webPageId}.${Date.now()}.js`;
    if (!fs.existsSync(`${projectPath}/app/view/init-json/page-temp/`)) {
      fs.mkdirSync(`${projectPath}/app/view/init-json/page-temp/`);
    }
    const fileList = fs.readdirSync(`${projectPath}/app/view/init-json/page-temp/`);
    const configDefaultPath = `${projectPath}/config/config.default.js`;
    // 清空临时文件夹
    fileList.forEach(file => {
      fs.unlinkSync(`${projectPath}/app/view/init-json/page-temp/${file}`);
    });
    // copy之前，给每个 tag项增加一个唯一标识
    const jsonText = fs.readFileSync(jsonPath, "utf-8");
    const jsonTextLines = jsonText.split("\n");
    // 便利每一样，如果该行包含 tag: 则在下一行插入一个唯一标识
    const newLins: string[] = [];
    jsonTextLines.forEach(line => {
      if (line.includes("tag:")) {
        newLins.push(`uid: "tag_id_${Math.random().toString(36).substr(2, 16)}",`);
      }
      newLins.push(line);
    });
    // 复制一份到临时文件夹
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
    let prettierText = prettier.format(newLins.join("\n"), { parser: "babel" });
    prettierText = (prettierText as string).replace(/window\.innerWidth <=? \d+/gm, match => '"__FUN__(' + match + ')__FUN__"');
    fs.writeFileSync(newJsonPath, prettierText as string);
    let primaryColor = "";
    const configDefaultContent = fs.readFileSync(configDefaultPath, "utf-8");
    const regex = /(primaryColor:\s*")([^"]*)(")/;
    const matchs = configDefaultContent.match(regex);
    if (matchs) {
      primaryColor = matchs[2];
    }
    void import(newJsonPath).then((pageConfig: any) => {
      void vscode.commands.executeCommand("webviewHandler.openPageDesign", {
        appId,
        pageId: "pageDesign",
        currDatabase,
        appDir: projectPath,
        pageName: `[${appId as string} - ${webPageId}]页面设计`,
        pageInfo: {
          webPageId,
          webPageName: webPageId,
          projectPath,
          panelId,
          common: pageConfig.common,
          jsonPath: newJsonPath,
          pageContent: pageConfig.pageContent,
          actionContent: pageConfig.actionContent,
          headContent: pageConfig.headContent,
          includeList: pageConfig.includeList,
          headContentStudio: pageConfig.headContentStudio,
          hasHelpDrawer: pageConfig.hasHelpDrawer,
          primaryColor,
        },
      });
    });
  }
}
