/* eslint-disable @typescript-eslint/restrict-template-expressions */
// 初始化框架核心
import * as vscode from "vscode";
import { Knex } from "knex";
import { BizError, ErrorInfo } from "../common/constants";
import Logger from "../util/logger";
import { sqlResource } from "../util/resourceUtil";
import JianghuKnexManager from "./jianghuKnexManager";
import KnexManager from "./knexManager";
import ServiceManager from "./serviceManager";
import TableManager from "./tableManager";
import WebviewManager from "./webviewManager";
import * as fs from "fs";
import { ConfigUtil } from "../util/configUtil";
import { spawn } from "child_process";
import open = require("open");
import { PathUtil } from "../util/pathUtil";
import * as http from "http";

export default class AppCore {
  public tableManager: TableManager;
  public serviceManager: ServiceManager;
  public webviewManager: WebviewManager;
  public knexManager: KnexManager;
  public jianghuKnexManager: JianghuKnexManager;
  private appCreateTerminal: vscode.Terminal | null = null;
  private returnBody = {};
  constructor() {
    this.tableManager = new TableManager();
    this.serviceManager = new ServiceManager();
    this.webviewManager = new WebviewManager();
    this.jianghuKnexManager = new JianghuKnexManager();
    this.knexManager = new KnexManager();
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
      // 读取数据库现有字段
      case "getFieldListRequest": {
        void this.getFieldListRequest(body, uri, panel);
        break;
      }
      // 读取页面的配置文件
      case "getFieldConfigRequest": {
        this.getFieldConfigRequest(body, uri, panel);
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
      case "updatePageConfig": {
        if (body.appData) {
          const { webPageId, actionData } = body.appData;
          await this.checkPageJson(body, webPageId, uri.appDir as string, panel);
          await this.updatePageConfig(actionData, webPageId as string, uri.appDir);
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
      case "updateTableForm": {
        const { webPageId, actionData } = body.appData;
        // 根据字段的config生成 table表
        await this.updateTable(body.appData, uri);
        // 根据 table表用命令自动生成 json配置
        await this.checkPageJson(body, webPageId, uri.appDir as string, panel);
        // 对 json配置进行重新配置
        await this.buildPageJson(actionData, uri.appDir as string, webPageId as string);
        // 根据最新的 json配置生成新的页面表单布局
        await this.buildPageFromJson(body, uri.appDir as string, panel, webPageId as string, "saveFieldResponse");
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
        await this.resourceHandler(body, uri, panel);
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
  private updatePageConfig(actionData: any, webPageId: string, appDir: any) {
    const { tableConfig, pageConfig, itemKey } = actionData;
    const jsonPath = `${appDir}/app/view/init-json/page/${webPageId}.js`;
    return new Promise(resolve => {
      void import(jsonPath).then((pageJson: any) => {
        pageJson.common.data.tableSelected = [];
        pageJson.common.data.isMobile = "window.innerWidth < 600";
        pageJson.pageContent.attrs = {
          ":show-select": pageConfig.showSelect.value,
          ":single-select": pageConfig.singleSelect.value,
          "v-model": "tableSelected",
          "item-key": itemKey,
        };
        pageJson.pageContent.value = (tableConfig as []).map((item: any) => ({
          ...item,
          type: "v-text-field",
          itemKey: itemKey === item.value,
          // formatter: "dateTimeFormatter",
        }));
        pageJson.pageContent.rowActionList = (pageConfig.rowActionList as []).map((item: any) => ({
          tag: "span",
          value: `<v-icon size="16" class="${item.color}--text">mdi-${item.icon}</v-icon>${item.label}`,
          item,
          attrs: {
            role: "button",
            class: `${item.color}--text font-weight-medium font-size-2 mr-2`,
            "@click": `doUiAction('${item.click}', item)`,
          },
        }));
        pageJson.pageContent.headActionList = (pageConfig.headActionList as []).map((item: any) => ({
          tag: "v-btn",
          value: `${item.label}`,
          item,
          attrs: {
            color: "success",
            outlined: true,
            class: "mr-2",
            "@click": `doUiAction('${item.click}')`,
          },
        }));
        const pageJsonStr = `const content = ${JSON.stringify(pageJson, null, 2)};\n\n module.exports = content;`;
        fs.writeFileSync(jsonPath, pageJsonStr);
        resolve(true);
      });
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

  private getFieldConfigRequest(body: any, uri: any, panel: vscode.WebviewPanel) {
    const { webPageId } = body.appData;
    const jsonPath = `${uri.appDir}/app/view/init-json/page/${webPageId}.js`;
    if (!fs.existsSync(jsonPath)) {
      if (panel) {
        const returnBody = { ...body, packageType: "getFieldConfigResponse", appData: { error: true } };
        void panel.webview.postMessage(returnBody);
      }
      return;
    }
    // js中是 module.exports = content; 这里需要把 content 转换为 json
    void import(jsonPath).then((pageConfig: any) => {
      if (!pageConfig) {
        // 回消息
        if (panel) {
          const returnBody = { ...body, packageType: "getFieldConfigResponse", appData: { error: true } };
          void panel.webview.postMessage(returnBody);
        }
        return;
      }
      // 回消息
      if (panel) {
        const returnBody = {
          ...body,
          packageType: "getFieldConfigResponse",
          appData: {
            formItemList: pageConfig.createDrawerContent.formItemList,
            contentList: pageConfig.updateDrawerContent.contentList,
            constantObj: pageConfig.common.data.constantObj,
            pageContent: pageConfig.pageContent,
            headerContent: pageConfig.headerContent || {},
          },
        };
        void panel.webview.postMessage(returnBody);
      }
    });
  }
  private async buildPageFromJson(body: any, appFolder: string, panel: vscode.WebviewPanel, webPageId: string, packageType: string) {
    // 运行命令 jianghu-init json --generateType=page --pageType=webPageId --file=webPageId -y
    return new Promise(resolve => {
      const commandText = `jianghu-init json --generateType=page --pageType=page --file=${webPageId} -y`;
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
      });
      child.stderr.on("data", data => {
        // 创建失败；重新运行
        console.error(`buildPageFromJson stderr: ${data}`);
      });
      child.on("close", code => {
        console.log(`buildPageFromJson child process exited with code ${code}`);
        resolve(true);
      });
    });
  }
  private async buildPageJson(actionData: any, appDir: string, webPageId: string) {
    return new Promise(resolve => {
      const { fieldList } = actionData;
      const jsonPath = `${appDir}/app/view/init-json/page/${webPageId}.js`;
      // js中是 module.exports = content; 这里需要把 content 转换为 json
      void import(jsonPath).then((pageConfig: any) => {
        // 复制component/customRule.html到项目中
        if (fs.existsSync(`${appDir}/app/view/component/customRule.html`)) {
          fs.unlinkSync(`${appDir}/app/view/component/customRule.html`);
        }
        fs.copyFileSync(PathUtil.getExtensionFileAbsolutePath(PathUtil.extensionContext, `src/view/common/customRule.html`), `${appDir}/app/view/component/customRule.html`);
        pageConfig.common.data.validationRules = {};
        pageConfig.common.data.tableSelected = [];
        pageConfig.common.data.isMobile = "window.innerWidth < 600";
        // TODO 自定义的 rule规则如何完整的放入到 json中
        // pageConfig.common.created = [];

        pageConfig.includeList = [{ type: "include", path: `component/customRule.html` }];
        const formItemList: any[] = [];
        (fieldList as []).map((item: any) => {
          const {
            fieldName,
            text,
            tag,
            config: { cols, rules, constants, ...configMap },
          } = item;
          if (constants) {
            constants.constantKey = fieldName;
            if (!pageConfig.common.data.constantObj) {
              pageConfig.common.data.constantObj = {};
            }
            pageConfig.common.data.constantObj[fieldName] = constants.constantValue;
          }
          let newItem = {};
          if (tag === "v-select") {
            newItem = { label: text, model: fieldName, tag, rules, cols, attrs: { ":items": `constantObj.${fieldName}`, ...configMap.attributes } };
          } else {
            newItem = { label: text, model: fieldName, tag, rules, cols, attrs: { ...configMap.attributes } };
          }
          formItemList.push(newItem);
        });
        pageConfig.createDrawerContent.formItemList = formItemList;
        const pageConfigJson = `const content = ${JSON.stringify(pageConfig, null, 2)};\n\n module.exports = content;`;
        fs.writeFileSync(jsonPath, pageConfigJson);
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
      // 运行项目下的 package.json 中的 scripts.start
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
        const { fieldName, text: fieldComment, fieldType } = item;
        if (fieldName === "id") {
          return;
        }
        const field: any = {
          fieldName,
          fieldComment,
          fieldType,
        };
        // 重复的字段，不再创建
        const exsitField: any = (tableFieldListResult[0] as []).find((tableField: any) => tableField.Field === fieldName);
        if (exsitField) {
          tableExsitFieldList.push(field);
        } else {
          tableFieldList.push(field);
        }
      });
      // 更新表字段的 sql
      tableSql = `ALTER TABLE \`${tableName}\` `;
      // 补充新字段
      tableFieldList.map((item: any) => {
        const { fieldName, fieldType, fieldComment } = item;
        tableSql += `ADD COLUMN \`${fieldName}\` ${fieldType} COLLATE utf8mb4_bin DEFAULT NULL COMMENT '${fieldComment}',`;
      });
      // tableExsitFieldList 对比下，修改字段类型
      tableExsitFieldList.map((item: any) => {
        const { fieldName, fieldType, fieldComment } = item;
        const exsitField: any = (tableFieldListResult[0] as []).find((tableField: any) => tableField.Field === fieldName);
        if (fieldType !== exsitField.Type || fieldComment !== exsitField.Comment) {
          tableSql += `MODIFY COLUMN \`${fieldName}\` ${fieldType} COLLATE utf8mb4_bin DEFAULT NULL COMMENT '${fieldComment}',`;
        }
        // 去掉最后一个逗号
      });
      tableSql = tableSql.substring(0, tableSql.length - 1);
    } else {
      (fieldList as []).map((item: any) => {
        const { fieldName, text: fieldComment, fieldType } = item;
        const field: any = {
          fieldName,
          fieldComment,
          fieldType,
        };
        tableFieldList.push(field);
      });
      // 创建表的 sql
      tableSql = `CREATE TABLE \`${tableName}\` (\`id\` int(11) NOT NULL AUTO_INCREMENT,`;
      tableFieldList.map((item: any) => {
        const { fieldName, fieldType, fieldComment } = item;
        tableSql += `\`${fieldName}\` ${fieldType} COLLATE utf8mb4_bin DEFAULT NULL COMMENT '${fieldComment}',`;
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

  private vlidatePageConfig(body: any, webPageId: any, appFolder: any, panel: vscode.WebviewPanel) {
    // 验证下 page的 config是否完整，是否已坏等等
  }

  private async checkPageJson(body: any, webPageId: any, appFolder: any, panel: vscode.WebviewPanel) {
    // 运行命令 jianghu-init json --generateType=json --pageType=jh-page --table=pageId --pageId=pageId -y
    return new Promise(resolve => {
      const jsonPath = `${appFolder}/app/view/init-json/page/${webPageId}.js`;
      if (fs.existsSync(jsonPath)) {
        //  TODO 验证文件是否有效
        // this.vlidatePageConfig(body, webPageId, appFolder, panel);
        resolve(true);
        return;
      }
      // jianghu-init json --generateType=json --pageType=jh-page --table=ceshi --pageId=ceshi -y
      const commandText = `jianghu-init json --generateType=json --pageType=jh-page --table=${webPageId} --pageId=${webPageId} -y`;
      const child = spawn(commandText, [], {
        cwd: appFolder,
        shell: true,
      });
      child.stdout.on("data", (data: string) => {
        console.log(`checkPageJson stdout: ${data}`);
        const returnBody = { ...body, packageType: "saveFieldResponse", appData: { message: `${data}` } };
        // 回消息
        if (panel) {
          void panel.webview.postMessage(returnBody);
        }
      });
      child.stderr.on("data", data => {
        // 创建失败；重新运行
        console.error(`checkPageJson stderr: ${data}`);
      });
      child.on("close", code => {
        console.log(`checkPageJson: child process exited with code ${code}`);
        resolve(true);
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
    if (
      !this.serviceManager.getServiceMap() ||
      !resourceData ||
      !this.serviceManager.getServiceMap()[resourceData.service] ||
      !this.serviceManager.getServiceMap()[resourceData.service][resourceData.serviceFunction]
    ) {
      Logger.error(`${resourceData.service as string} : ${resourceData.serviceFunction as string}`);
      throw new BizError(ErrorInfo.resource_not_found);
    }
  }
}
