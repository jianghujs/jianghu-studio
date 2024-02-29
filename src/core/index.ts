/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable import/no-extraneous-dependencies */
// 初始化框架核心
import * as vscode from "vscode";
import { Knex } from "knex";
import Logger from "../util/logger";
import KnexManager from "./knexManager";
import WebviewManager from "./webviewManager";
import * as fs from "fs";
import { ConfigUtil } from "../util/configUtil";
import { spawn } from "child_process";
import open = require("open");
import { PathUtil } from "../util/pathUtil";
import * as http from "http";
import ResourceService from "../service/resource";
import JianghuKnexManager from "./jianghuKnexManager";
import { sqlResource } from "../util/resourceUtil";
import TableManager from "./tableManager";
import ServiceManager from "./serviceManager";
import { BizError, ErrorInfo } from "../common/constants";
// @ts-ignore
// eslint-disable-next-line import/no-extraneous-dependencies
import * as prettier from "prettier";
// eslint-disable-next-line import/no-extraneous-dependencies
import * as parser from "@babel/parser";
// @ts-ignore
import traverse from "@babel/traverse";
import dayjs = require("dayjs");

export default class AppCore {
  public resourceService: ResourceService;
  public webviewManager: WebviewManager;
  public tableManager: TableManager;
  public serviceManager: ServiceManager;

  constructor() {
    this.tableManager = new TableManager();
    this.resourceService = new ResourceService();
    this.webviewManager = new WebviewManager();
    this.serviceManager = new ServiceManager();
  }

  // 接收来自与 webview 的消息
  public async handleMessage({ body, uri }: any) {
    console.log(body, uri);
    const { packageType } = body;
    const pageId = uri.pageId;
    const appFolder: string | undefined = uri.appDir;
    console.log("pageId", pageId);
    const panel = this.webviewManager.getPanel(pageId as string);
    switch (packageType) {
      // 选择工作目录
      case "selectWorkFolder": {
        const fsPath = await this.selectFolder();
        if (panel) {
          const returnBody = { ...body, packageType: "selectWorkFolderResponse", appData: { fsPath } };
          void panel.webview.postMessage(returnBody);
        }
        break;
      }
      case "getTables": {
        void this.getTables(uri, panel);
        break;
      }
      // 选择工作目录
      case "vscodeToast": {
        const {
          appData: { message },
        } = body;
        if (message) {
          void vscode.window.showInformationMessage(message as string);
        }
        break;
      }
      // 读取数据库现有字段
      case "getFieldListRequest": {
        void this.getFieldListRequest(body, uri, panel);
        break;
      }
      // 读取页面的配置文件
      case "getPageConfigRequest": {
        this.getPageConfigRequest(body, uri, panel);
        break;
      }
      // 打开设计页面
      case "pageDesignRequest": {
        this.pageDesignRequest(body, uri);
        break;
      }
      // 创建项目
      case "submitCreateAppForm": {
        this.submitCreateAppForm(body, uri, panel, appFolder as string);
        break;
      }
      // 更新页面的配置
      case "updatePageContent": {
        if (body.appData) {
          const { webPageId, actionData } = body.appData;
          void this.updatePageConfigJson(actionData, webPageId as string, uri.appDir);
          this.backOldHtml(uri.appDir as string, webPageId as string);
          await this.buildPageFromJson(body, uri.appDir as string, panel, webPageId as string, "updatePageConfigResponse");
        }
        const returnBody = { ...body, packageType: "updatePageConfigResponse", appData: { isEnd: true } };
        // 回消息
        if (panel) {
          await panel.webview.postMessage(returnBody);
        }
        break;
      }
      // 创建表、生成 json、page、把 ui配置同步到 json
      case "updateTableField": {
        // 根据字段的config生成 table表
        await this.updateTable(body.appData, uri);
        // 通知页面，任务完成
        const returnBody = { ...body, packageType: "saveFieldResponse", appData: { isEnd: true } };
        // 回消息
        if (panel) {
          await panel.webview.postMessage(returnBody);
        }
        break;
      }
      // 正常数据请求
      case "messageRequest":
        if (!body.isJianghuAxios) {
          await this.resourceHandler(body, uri, panel);
        } else {
          await this.normalRequest(body, uri, panel);
        }
        break;
      // 创建空白页面
      case "createPageRequest":
        void this.createEmptyPage(body, uri);
        await this.resourceHandler(body, uri, panel);
        break;
      // 启动服务、查看页面
      case "viewPageRequest": {
        this.viewPageRequest(body, uri, panel, appFolder as string);
        break;
      }
      default:
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async updatePageConfigJson(actionData: any, webPageId: string, appDir: any) {
    const { pageJsonContent } = actionData;
    const resJsonPath = `${appDir}/app/view/init-json/page/${webPageId}.js`;
    let configContent = (pageJsonContent as string).replace(/"__FUN__(.*?)__FUN__"/g, (match: any, p1: any) => p1).replace(/\\n/g, "\n");
    configContent = configContent
      .replace(/\n/g, "") // 删除换行符
      .replace(/:\s+/g, ": ") // 在冒号后添加空格
      .replace(/,\s+/g, ", ") // 在逗号后添加空格
      .replace(/\{\s+/g, "{") // 删除左大括号后的空格
      .replace(/\}\s+/g, "}"); // 删除右大括号后的空格
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    let pageConfigString = `const content = ${configContent}; module.exports = content;`;
    const pretterConfig = {
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
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    pageConfigString = prettier.format(pageConfigString, pretterConfig);
    fs.writeFileSync(resJsonPath, pageConfigString);
  }

  private updatePageConfig(actionData: any, webPageId: string, appDir: any) {
    const { header, headerKey, pageContent, hasHelpDrawer, headContentStudio, actionContent, constantObj, cPrimaryColor, jsonPath, rootPath } = actionData;
    const resJsonPath = `${appDir}/app/view/init-json/page/${webPageId}.js`;
    let pageConfigString = fs.readFileSync(jsonPath as string, "utf8");
    const resAst = parser.parse(pageConfigString, {
      sourceType: "module",
      plugins: ["typescript", "asyncGenerators", "classProperties", "dynamicImport", "objectRestSpread"],
    });

    // 用 traverse 遍历下，找到对应的节点行数，然后替换直接行数替换
    const constantObjRange = { start: -1, end: -1 };
    const pageContentRange = { start: -1, end: -1 };
    const actionContentRange = { start: -1, end: -1 };
    const headContentRange = { start: -1, end: -1 };
    const hasHelpDrawerRange = { start: -1, end: -1 };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    traverse(resAst, {
      ObjectProperty(path: any) {
        if (path.node.key.name === "hasHelpDrawer") {
          hasHelpDrawerRange.start = path.node.loc.start.line;
          hasHelpDrawerRange.end = path.node.loc.end.line;
        }
        if (path.node.key.name === "constantObj") {
          constantObjRange.start = path.node.loc.start.line;
          constantObjRange.end = path.node.loc.end.line;
        }
        if (path.node.key.name === "pageContent") {
          pageContentRange.start = path.node.loc.start.line;
          pageContentRange.end = path.node.loc.end.line;
        }
        if (path.node.key.name === "actionContent") {
          actionContentRange.start = path.node.loc.start.line;
          actionContentRange.end = path.node.loc.end.line;
        }
        if (path.node.key.name === "headContentStudio") {
          headContentRange.start = path.node.loc.start.line;
          headContentRange.end = path.node.loc.end.line;
        }
      },
    });
    const indexList: any[] = actionContent ? [actionContentRange, constantObjRange] : [pageContentRange, headContentRange, hasHelpDrawerRange];
    const indexListKey: any[] = actionContent ? ["actionContent", "constantObj"] : ["pageContent", "headContentStudio", "hasHelpDrawer"]; // , "actionContent", "headContent"
    let pageConfigStringLines = pageConfigString.split("\n");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    indexList.forEach((item: any, index: number) => {
      let startLine = item.start - 1;
      while (startLine < item.end) {
        pageConfigString = pageConfigStringLines[startLine] = startLine === item.start - 1 ? `${indexListKey[index]}:<!!${indexListKey[index]}!!>,` : "<!LINETEMP!>";
        startLine++;
      }
    });
    pageConfigStringLines = pageConfigStringLines.filter(item => item !== "<!LINETEMP!>");
    pageConfigString = pageConfigStringLines.join("\n");
    // 替换 data内的数据；前提是数据中不能有数组
    if (headerKey) {
      const headerRegex = new RegExp((headerKey as string) + ": \\[.*?\\],", "s");
      pageConfigString = pageConfigString.replace(headerRegex, `${headerKey}: ${JSON.stringify(header, null, 2)},`);
    }
    if (hasHelpDrawer !== undefined) {
      pageConfigString = pageConfigString.replace(`hasHelpDrawer:<!!hasHelpDrawer!!>`, `hasHelpDrawer: ${hasHelpDrawer}`);
    }
    if (constantObj) {
      pageConfigString = pageConfigString.replace(`constantObj:<!!constantObj!!>`, `constantObj: ${JSON.stringify(constantObj, null, 2)}`);
    }
    if (pageContent) {
      pageConfigString = pageConfigString.replace(`pageContent:<!!pageContent!!>`, `pageContent: ${JSON.stringify(pageContent, null, 2)}`);
    }
    if (headContentStudio) {
      pageConfigString = pageConfigString.replace(`headContentStudio:<!!headContentStudio!!>`, `headContentStudio: ${JSON.stringify(headContentStudio, null, 2)}`);
    }
    if (actionContent) {
      pageConfigString = pageConfigString.replace(`actionContent:<!!actionContent!!>`, `actionContent: ${JSON.stringify(actionContent, null, 2)}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    pageConfigString = prettier.format(pageConfigString, { parser: "babel" });
    fs.writeFileSync(resJsonPath, pageConfigString);
    // 改变主题色
    if (cPrimaryColor) {
      const configPath = `${rootPath}config/config.default.js`;
      let configContent = fs.readFileSync(configPath, "utf8");
      const regex = /(primaryColor:\s*")([^"]*)(")/;
      // 替换 primaryColor 的值
      configContent = configContent.replace(regex, "$1" + (cPrimaryColor as string) + "$3");
      fs.writeFileSync(configPath, configContent);
    }
  }

  private getTables(uri: any, panel: vscode.WebviewPanel) {
    const { currDatabase: database } = uri;

    // 根据webPageId创建数据库表
    const knex = KnexManager.client(database as Knex.MySqlConnectionConfig);

    if (!knex) {
      // 异常提示
      Logger.showError("数据库连接失败");
      return;
    }

    void knex.raw("SHOW TABLES").then(tables => {
      console.log("SHOW TABLES", tables);
      const returnBody = {
        packageType: "getTablesResponse",
        appData: {
          tables: tables[0],
        },
      };
      void panel.webview.postMessage(returnBody);
    });
  }

  private async getFieldListRequest(body: any, uri: any, panel: vscode.WebviewPanel) {
    const { appData } = body;
    const { currDatabase: database } = uri;
    if (!appData) {
      return null;
    }
    const { webPageId } = appData;

    // 根据webPageId创建数据库表
    const tableName = `${webPageId}`;
    const knex = KnexManager.client(database as Knex.MySqlConnectionConfig);
    if (!knex) {
      // 异常提示
      Logger.showError("数据库连接失败");
      return;
    }
    // 检查下表是否存在
    const tableExist = await knex.schema.hasTable(tableName);
    if (tableExist) {
      // 读取表的所有字段
      const tableFieldListResult = await knex.raw(`show full fields from ${tableName}`);
      const returnBody = {
        ...body,
        packageType: "getFieldConfigResponse",
        appData: {
          fieldList: tableFieldListResult[0],
        },
      };
      void panel.webview.postMessage(returnBody);
    } else {
      const returnBody = {
        ...body,
        packageType: "getFieldConfigResponse",
        appData: {
          fieldList: [],
        },
      };
      void panel.webview.postMessage(returnBody);
    }
  }

  private getPageConfigRequest(body: any, uri: any, panel: vscode.WebviewPanel) {
    const { pageJsonPath } = body.appData;
    if (!pageJsonPath || !fs.existsSync(pageJsonPath as string)) {
      if (panel) {
        const returnBody = { ...body, packageType: "getFieldConfigResponse", appData: { error: true } };
        void panel.webview.postMessage(returnBody);
      }
      return;
    }
    // 读取临时文件内容
    const content = fs.readFileSync(pageJsonPath as string, "utf8");
    const newFilePath = (pageJsonPath as string).replace(".js", `.${+new Date()}.js`);
    fs.writeFileSync(newFilePath, content);
    // js中是 module.exports = content; 这里需要把 content 转换为 json
    void import(newFilePath).then((pageConfig: any) => {
      fs.unlinkSync(newFilePath);
      if (!pageConfig) {
        // 回消息
        if (panel) {
          const returnBody = { ...body, packageType: "getFieldConfigResponse", appData: { error: true } };
          void panel.webview.postMessage(returnBody);
        }
        return;
      }
      // 表达式和函数在传递到页面的时候，就没了
      pageConfig = JSON.parse(
        JSON.stringify(
          pageConfig,
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
      // 回消息
      if (panel) {
        const returnBody = {
          ...body,
          packageType: "getFieldConfigResponse",
          appData: {
            ...pageConfig,
          },
        };
        void panel.webview.postMessage(returnBody);
      }
    });
  }
  private backOldHtml(appFolder: string, webPageId: string) {
    const htmlPath = `${appFolder}/app/view/page/${webPageId}.html`;
    // 备份下 htmlPath
    const htmlPathBak = `${appFolder}/app/view/page/${webPageId}.${dayjs().format("YYYY_MM_DD_HH_mm_ss")}.html`;
    fs.copyFileSync(htmlPath, htmlPathBak);
  }

  private async buildPageFromJson(body: any, appFolder: string, panel: vscode.WebviewPanel, webPageId: string, packageType: string) {
    // 运行命令 jianghu-init json --generateType=page --pageType=webPageId --file=webPageId -y
    return new Promise(resolve => {
      const commandBasic = "node /Users/benshanyue/fsll/projects/jianghujs-script-util/openjianghu01/002.jianghu-init/jianghu-init/bin/jianghu-init.js";
      // const commandBasic = "jianghu-init";
      const commandText = `${commandBasic} json --generateType=page --pageType=page --file=${webPageId} -y`;
      const child = spawn(commandText, [], {
        cwd: appFolder,
        shell: true,
      });
      child.stdout.on("data", (data: string) => {
        console.log(`buildPageFromJson stdout: ${data}`);
        const returnBody = { ...body, packageType, appData: { message: `${data}` } };
        // 回消息
        if (panel) {
          void panel.webview.postMessage(returnBody);
        }
        void vscode.window.showInformationMessage(`${data}`);
      });
      child.stderr.on("data", data => {
        // 创建失败；重新运行
        console.error(`buildPageFromJson stderr: ${data}`);
      });
      child.on("close", code => {
        console.log(`buildPageFromJson child process exited with code ${code}`);
        // 格式化下处理
        // const htmlPath = `${appFolder}/app/view/page/${webPageId}.html`;
        // const textA = fs.readFileSync(htmlPath, "utf8");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
        // fs.writeFileSync(htmlPath, prettier.format(textA, { parser: "html" }));
        resolve(true);
      });
    });
  }

  private viewPageRequest(body: any, uri: any, panel: vscode.WebviewPanel, appFolder: string) {
    const { appId, webPageId } = body.appData;
    const startApp = () => {
      const devCommand = "npm run dev";
      const packageJsonText = ConfigUtil.readPackageJsonDevCommand(appFolder);
      let port: string | null = "3000";
      if (packageJsonText && packageJsonText.scripts.dev) {
        const matchResult = (packageJsonText.scripts.dev as string).match(/--port=(\d+)/);
        port = matchResult ? matchResult[1] : null;
      }

      // 启动项目，并且在一个新的 webview 中打开 pageId
      if (devCommand) {
        let t1: vscode.Terminal | undefined = vscode.window.terminals.find(terminal => terminal.name === `启动项目${appId}`);
        if (!t1) {
          // 运行该命令
          t1 = vscode.window.createTerminal({ name: `启动项目${appId}`, message: "启动项目", cwd: appFolder });
          t1.show(false);
          t1.sendText(devCommand as string);
        }
        // http验证网址是否可访问
        const checkUrl = `http://127.0.0.1:${port}/${appId}/page/${webPageId}`;

        const openUrl = (time: number) => {
          // 超过10秒，停止
          if (new Date().getTime() - time > 10000) {
            const returnBody = { ...body, packageType: "viewPageRequestResponse", appData: { isEnd: true, state: "fail" } };
            // 回消息
            if (panel) {
              void panel.webview.postMessage(returnBody);
            }
            return;
          }
          http
            .get(checkUrl, res => {
              if (res.statusCode === 200 || res.statusCode === 302) {
                void open(`http://127.0.0.1:${port}/${appId}/page/${webPageId}`);
                const returnBody = { ...body, packageType: "viewPageRequestResponse", appData: { isEnd: true, state: "success" } };
                // 回消息
                if (panel) {
                  void panel.webview.postMessage(returnBody);
                }
              } else {
                setTimeout(() => {
                  openUrl(time);
                }, 600);
              }
            })
            .on("error", () => {
              setTimeout(() => {
                openUrl(time);
              }, 600);
            });
        };
        openUrl(new Date().getTime());
      }
    };
    // 判断下是否存在node_modules
    if (!fs.existsSync(`${appFolder}/node_modules`)) {
      // 用 spawn 执行 npm install
      const child = spawn("npm install --verbose", [], {
        cwd: appFolder,
        shell: true,
      });
      child.stdout.on("data", (data: string) => {
        console.log(`stdout: ${data}`);
        const returnBody = { ...body, packageType: "viewPageRequestResponse", appData: { message: `${data}` } };
        if (panel) {
          void panel.webview.postMessage(returnBody);
        }
      });
      // 当 child 结束的时候，执行 startApp
      child.on("close", code => {
        console.log(`child process exited with code ${code}`);
        startApp();
      });
    } else {
      startApp();
    }
  }
  private submitCreateAppForm(body: any, uri: any, panel: vscode.WebviewPanel, appFolder: string) {
    // const commandText = "export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7890";
    // const commandText2 = `node /Users/benshanyue/fsll/projects/jianghujs-script-util/openjianghu01/002.jianghu-init/jianghu-init/bin/jianghu-init.js`;
    // const commandText2 = `jianghu-init`;
    const { workspaceFolders, appId, appName, databaseIp, databasePort, databaseUser, databasePassword } = body.appData;
    if (!appFolder) {
      appFolder = `${workspaceFolders}/${appId}`;
    }
    if (fs.existsSync(`${appFolder}`)) {
      if (fs.readdirSync(`${appFolder}`).length) {
        void vscode.window.showErrorMessage("目录已存在且非空，请更换新目录或者删除已存在目录");
        return;
      }
    } else {
      fs.mkdirSync(`${appFolder}`);
    }
    const env = Object.create(process.env);
    env.https_proxy = "http://127.0.0.1:7890";
    env.http_proxy = "http://127.0.0.1:7890";
    env.all_proxy = "socks5://127.0.0.1:7890";
    const commandDir = `--dir=${appFolder}`;
    const commandTextType = `--type=1table-crud`;
    const commandDbIp = `--dbIp=${databaseIp}`;
    const commandDbPort = `--dbPort=${databasePort}`;
    const commandDbUser = `--dbUser=${databaseUser}`;
    const commandDbPass = `--dbPass=${databasePassword}`;
    const child = spawn(`jianghu-init project ${commandDir} ${commandTextType} ${commandDbIp} ${commandDbPort} ${commandDbUser} ${commandDbPass}`, [], {
      env,
      cwd: `${appFolder}`,
      shell: true,
    });
    let num = 1;
    // let hander: NodeJS.Timeout | null = null;
    child.stdout.on("data", (data: string) => {
      if (`${data}`.length <= 10) {
        return;
      }
      num++;
      console.log(`打印下${num}: ${data}`);
      if (data.includes("? project name")) {
        child.stdin.write(`${appName}\n`); // 替换为你的输入
      } else if (data.includes("? project description")) {
        child.stdin.write(`\n`); // 替换为你的输入
      } else if (data.includes("? project author")) {
        child.stdin.write(`\n`); // 替换为你的输入
      } else if (data.includes("? cookie security keys")) {
        child.stdin.write(`\n`); // 替换为你的输入
      } else if (data.includes("? database name")) {
        child.stdin.write(`\n`); // 替换为你的输入
      }
      const returnBody = { ...body, packageType: "submitCreateAppFormResponse", appData: { message: `${data}` } };
      // 回消息
      if (panel) {
        void panel.webview.postMessage(returnBody);
      }
    });
    child.stderr.on("data", data => {
      console.error(`stderr: ${data}`);
    });

    child.on("close", code => {
      console.log(`child process exited with code ${code}`);
      const returnBody = {
        ...body,
        packageType: "submitCreateAppFormResponse",
        appData: {
          message: "创建成功",
          isEnd: true,
        },
      };
      // 回消息
      if (panel) {
        void panel.webview.postMessage(returnBody);
      }
      // 刷新左侧 tree
      void vscode.commands.executeCommand("appProvider.refreshAppList");
    });
  }
  private pageDesignRequest(body: any, uri: any) {
    const { pageId: webPageId, pageFile, pageName: webPageName } = body.appData.pageInfo;
    const { appId, currDatabase } = uri;
    // 打开页面设计
    void vscode.commands.executeCommand("webviewHandler.openPageDesign", {
      appId,
      pageId: "pageDesign",
      currDatabase,
      appDir: uri.appDir,
      pageName: `[${appId} - ${webPageId}]页面设计`,
      pageInfo: { webPageId, webPageName, pageFile },
    });
  }
  /**
   * 创建表格
   */
  private async updateTable(appData: any, uri: any) {
    const { currDatabase: database } = uri;
    if (!appData) {
      return null;
    }
    const {
      webPageId,
      webPageName,
      actionData: { fieldList },
    } = appData;

    // 根据webPageId创建数据库表
    const tableName = `${webPageId}`;
    const tableComment = webPageName;
    const knex = KnexManager.client(database as Knex.MySqlConnectionConfig);
    if (!knex) {
      // 异常提示
      Logger.showError("数据库连接失败");
      return;
    }
    const tableFieldList: any[] = [];
    const tableExsitFieldList: any[] = [];
    // 检查下表是否存在
    const tableExist = await knex.schema.hasTable(tableName);
    let tableSql = "";
    if (tableExist) {
      // 读取表的所有字段
      const tableFieldListResult = await knex.raw(`show full fields from ${tableName}`);
      (fieldList as []).map((item: any) => {
        const { Field } = item;
        if (Field === "id") {
          return;
        }
        // 重复的字段，不再创建
        const exsitField: any = (tableFieldListResult[0] as []).find((tableField: any) => tableField.Field === Field);
        if (exsitField) {
          tableExsitFieldList.push(item);
        } else {
          tableFieldList.push(item);
        }
      });
      // 更新表字段的 sql
      tableSql = `ALTER TABLE \`${tableName}\` `;
      // 补充新字段
      tableFieldList.map((item: any) => {
        const { Field, Type, Comment, Default } = item;
        tableSql += `ADD COLUMN \`${Field}\` ${Type} COLLATE utf8mb4_bin DEFAULT '${Default}' COMMENT '${Comment}',`;
      });
      // tableExsitFieldList 对比下，修改字段类型
      tableExsitFieldList.map((item: any) => {
        const { Field, Type, Comment, Default } = item;
        const exsitField: any = (tableFieldListResult[0] as []).find((tableField: any) => tableField.Field === Field);
        if (Type !== exsitField.Type || Field !== exsitField.Field || Comment !== exsitField.Default || Comment !== exsitField.Default) {
          tableSql += `MODIFY COLUMN \`${Field}\` ${Type} COLLATE utf8mb4_bin DEFAULT '${Default}' COMMENT '${Comment}',`;
        }
        // 去掉最后一个逗号
      });
      tableSql = tableSql.substring(0, tableSql.length - 1);
    } else {
      // 创建表的 sql
      tableSql = `CREATE TABLE \`${tableName}\` (\`id\` int(11) NOT NULL AUTO_INCREMENT,`;
      (fieldList as any[]).map((item: any) => {
        const { Field, Type, Comment, Default } = item;
        tableSql += `\`${Field}\` ${Type} COLLATE utf8mb4_bin DEFAULT '${Default}' COMMENT '${Comment}',`;
      });
      tableSql += "`operation` varchar(255) COLLATE utf8mb4_bin DEFAULT 'insert' COMMENT '操作; insert, update, jhInsert, jhUpdate, jhDelete jhRestore',";
      tableSql += "`operationByUserId` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作者userId',";
      tableSql += "`operationByUser` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作者用户名',";
      tableSql += "`operationAt` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作时间; E.g: 2021-05-28T10:24:54+08:00 ',";
      tableSql += `PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='${tableComment}';`;
    }
    if (knex) {
      await knex.raw(tableSql);
    }
  }

  private selectFolder(): Promise<string> {
    return new Promise((resolve, reject) => {
      void vscode.window
        .showOpenDialog({
          canSelectMany: false,
          canSelectFolders: true,
          canSelectFiles: false,
        })
        .then(fileUri => {
          if (fileUri && fileUri[0]) {
            resolve(fileUri[0].fsPath);
          } else {
            reject("No folder selected");
          }
        });
    });
  }

  private createEmptyPage(body: any, uri: any) {
    const { appData } = body;
    const appFolder = uri.appDir;
    if (!appData) {
      return null;
    }
    const { pageId, pageFile } = appData.actionData;
    const templatePath = PathUtil.getExtensionFileAbsolutePath(PathUtil.extensionContext, `src/view/template/emptyTemplate.html`);
    const targetPath = `${appFolder}/app/view/page/${pageFile || pageId}.html`;
    // 把 templatePath 复制到 targetPath
    fs.copyFileSync(templatePath, targetPath);
    // <span id="pageName"></span>
    // 读取文件内容
    let content = fs.readFileSync(targetPath, "utf8");
    // 替换内容
    const pageName = body.appData.actionData.pageName; // 这里替换为你的页面名称
    content = content.replace('<span id="pageName"></span>', `<span id="pageName">${pageName}</span>`);
    // 写入新内容
    fs.writeFileSync(targetPath, content);
  }

  private async normalRequest(body: any, uri: any, panel?: vscode.WebviewPanel) {
    const { currDatabase: database } = uri;
    const { appData } = body;
    if (!appData) {
      return null;
    }
    const { pageId, actionId } = appData;
    // eslint-disable-next-line prefer-const
    let resultData: any;

    // database ===> ctx.app.knex
    const app: any = {};
    if (database) {
      app.jianghuKnex = JianghuKnexManager.client(database as Knex.MySqlConnectionConfig);
      app.knex = KnexManager.client(database as Knex.MySqlConnectionConfig);
      app.database = database;
    }
    const ctx = {
      request: { body },
      app: { logger: Logger, ...app },
    };

    if (ctx.app.database) {
      const tableResource = await sqlResource({
        jianghuKnex: ctx.app.jianghuKnex,
        appData: {
          where: {
            pageId,
            actionId,
          },
        },
        resourceData: { table: "_resource", operation: "select" },
      });
      if (!(tableResource?.rows as any)?.length) {
        if (panel) {
          const returnBody = { ...body, packageType: "messageResponse", appData: { resultData } };
          await panel.webview.postMessage(returnBody);
          return;
        }
      }
      const resourceData = (tableResource?.rows as any).length ? (tableResource?.rows as any)[0].resourceData : null;
      if (!resourceData) {
        if (panel) {
          const returnBody = { ...body, packageType: "messageResponse", appData: { resultData } };
          await panel.webview.postMessage(returnBody);
          return;
        }
      }
      resultData = await sqlResource({
        jianghuKnex: ctx.app.jianghuKnex,
        appData: body.appData,
        resourceData: JSON.parse(resourceData as string),
      });
    }
    const returnBody = { ...body, packageType: "messageResponse", appData: { resultData } };
    // 回消息
    if (panel) {
      await panel.webview.postMessage(returnBody);
    }
  }

  // 处理 resource的请求
  private async resourceHandler(body: any, uri: any, panel?: vscode.WebviewPanel) {
    const { currDatabase: database } = uri;
    const { appData } = body;
    if (!appData) {
      return null;
    }
    const { pageId, actionId } = appData;
    // eslint-disable-next-line prefer-const
    const resource = this.tableManager.findResource(pageId as string, actionId as string);
    let resultData: any;

    // database ===> ctx.app.knex
    const app: any = {};
    if (database) {
      app.jianghuKnex = JianghuKnexManager.client(database as Knex.MySqlConnectionConfig);
      app.knex = KnexManager.client(database as Knex.MySqlConnectionConfig);
      app.database = database;
    }
    const ctx = {
      request: { body },
      app: { logger: Logger, ...app },
    };
    if (resource) {
      const {
        resourceHook: { before: beforeHooks, after: afterHooks },
        resourceData,
      }: any = resource;
      if (beforeHooks) {
        for (const beforeHook of beforeHooks) {
          this.serviceFunctionCheck(beforeHook);
          // @ts-ignore
          await this.serviceManager.getServiceMap()[beforeHook.service][beforeHook.serviceFunction](ctx);
        }
      }
      if (resource.resourceType === "service") {
        this.serviceFunctionCheck(resourceData);
        // @ts-ignore
        resultData = await this.serviceManager.getServiceMap()[resourceData.service][resourceData.serviceFunction](ctx);
      } else if (resource.resourceType === "sql") {
        if (ctx.app.database) {
          resultData = await sqlResource({
            jianghuKnex: ctx.app.jianghuKnex,
            appData: body.appData,
            resourceData,
          });
        }
      }

      if (afterHooks) {
        for (const afterHook of afterHooks) {
          if (afterHook.service === "webview") {
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await this.webviewManager[afterHook.serviceFunction](ctx);
          } else {
            this.serviceFunctionCheck(afterHook);
            // @ts-ignore
            await this.serviceManager.getServiceMap()[afterHook.service][afterHook.serviceFunction](ctx);
          }
        }
      }
      // @ts-ignore
      if (resource.resourceType === "service" || (resource.resourceType === "sql" && !["select", "jhSelect"].includes(resource.resourceData.operation))) {
        if (database) {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          await this.serviceManager.getServiceMap().common.savePlanToFile(ctx.app.jianghuKnex, database);
        }
      }
    } else {
      Logger.showError(`无效的 resource 请求, pageId: ${pageId as string}, actionId: ${actionId as string}`);
      // todo error enum
      resultData = {
        error: "无效请求",
      };
    }
    if (body.appData.pageId === "pageManager" && body.appData.actionId === "selectList" && resultData && resultData.rows) {
      // 从过判断 init-json中是否有对应的文件，设置可设计状态
      (resultData.rows as []).map((item: any) => {
        // const jsonPath = `${appFolder}/app/view/init-json/page/${item.pageId}.js`;
        item.canDesign = item.pageId !== "help" && item.pageId !== "login";
      });
    }
    const returnBody = { ...body, packageType: "messageResponse", appData: { resultData } };
    // 回消息
    if (panel) {
      await panel.webview.postMessage(returnBody);
    }
  }

  private serviceFunctionCheck(resourceData: any): void {
    if (!this.serviceManager.getServiceMap() || !resourceData || !this.serviceManager.getServiceMap()[resourceData.service] || !this.serviceManager.getServiceMap()[resourceData.service][resourceData.serviceFunction]) {
      Logger.error(`${resourceData.service as string} : ${resourceData.serviceFunction as string}`);
      throw new BizError(ErrorInfo.resource_not_found);
    }
  }
}
