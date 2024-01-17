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

export default class AppCore {
  public tableManager: TableManager;
  public serviceManager: ServiceManager;
  public webviewManager: WebviewManager;
  public knexManager: KnexManager;
  public jianghuKnexManager: JianghuKnexManager;
  private appCreateTerminal: vscode.Terminal | null = null;
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
    let resultData: any;
    const returnBody = { ...body };
    const panel = this.webviewManager.getPanel(pageId as string);
    switch (packageType) {
      case "selectWorkFolder": {
        // 选择本地目录
        const fsPath = await this.selectFolder();
        if (panel) {
          returnBody.packageType = "selectWorkFolderResponse";
          returnBody.appData = {
            fsPath,
          };
          void panel.webview.postMessage(returnBody);
        }
        break;
      }
      case "submitCreateAppForm": {
        // 开始创建项目
        // const commandText = "export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7890";
        const commandText2 = `node /Users/benshanyue/fsll/projects/jianghujs-script-util/openjianghu01/002.jianghu-init/jianghu-init/bin/jianghu-init.js`;
        const { workspaceFolders, appId, appName, databaseIp, databasePort, databaseUser, databasePassword } = body.appData;
        if (fs.existsSync(`${workspaceFolders}/${appId}`)) {
          if (fs.readdirSync(`${workspaceFolders}/${appId}`).length) {
            void vscode.window.showErrorMessage("目录已存在且非空，请更换新目录或者删除已存在目录");
            return;
          }
        } else {
          fs.mkdirSync(`${workspaceFolders}/${appId}`);
        }
        const env = Object.create(process.env);
        env.https_proxy = "http://127.0.0.1:7890";
        env.http_proxy = "http://127.0.0.1:7890";
        env.all_proxy = "socks5://127.0.0.1:7890";
        const commandDir = `--dir=${workspaceFolders}/${appId}`;
        const commandTextType = `--type=1table-crud`;
        const commandDbIp = `--dbIp=${databaseIp}`;
        const commandDbPort = `--dbPort=${databasePort}`;
        const commandDbUser = `--dbUser=${databaseUser}`;
        const commandDbPass = `--dbPass=${databasePassword}`;
        const child = spawn(`${commandText2} project ${commandDir} ${commandTextType} ${commandDbIp} ${commandDbPort} ${commandDbUser} ${commandDbPass}`, [], {
          env,
          cwd: `${workspaceFolders}/${appId}`,
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
          returnBody.packageType = "submitCreateAppFormResponse";
          returnBody.appData = {
            message: `${data}`,
          };
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
          returnBody.packageType = "submitCreateAppFormResponse";
          returnBody.appData = {
            message: "创建成功",
            isEnd: true,
          };
          // 回消息
          if (panel) {
            void panel.webview.postMessage(returnBody);
          }
          // 刷新左侧 tree
          void vscode.commands.executeCommand("appProvider.refreshAppList");
        });
        // Terminal 方法
        // 关闭当前 webview页面
        // if (panel) {
        //   panel.dispose();
        // }
        // , appName, databaseIp, databasePort, databaseUser, databasePassword
        // const { workspaceFolders, appId } = body.appData;
        // if (fs.existsSync(`${workspaceFolders}/${appId}`)) {
        //   // eslint-disable-next-line no-template-curly-in-string
        //   void vscode.window.showErrorMessage("目录已存在，请更换新目录或者删除已存在目录");
        //   return;
        // }
        // if (!this.appCreateTerminal) {
        //   this.appCreateTerminal = vscode.window.createTerminal({ name: "正在应用创建", message: "开始创建项目", cwd: workspaceFolders, location: vscode.TerminalLocation.Editor });
        // }
        // const commandText = "export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 all_proxy=socks5://127.0.0.1:7890";
        // const commandText2 = `node /Users/benshanyue/fsll/projects/jianghujs-script-util/openjianghu01/002.jianghu-init/jianghu-init/bin/jianghu-init.js`;
        // const cwd = `${commandText} && cd ${workspaceFolders} && ${commandText2} project --type=1table-crud ${appId as string}`;
        // this.appCreateTerminal.show(false);
        // this.appCreateTerminal.sendText(cwd); // 输入命令
        // vscode.window.onDidChangeActiveTerminal(e => {
        //   if (e?.processId !== this.appCreateTerminal?.processId) {
        //     this.appCreateTerminal?.dispose();
        //     this.appCreateTerminal = null;
        //   }
        // });

        break;
      }
      case "messageRequest":
        // res请求
        resultData = await this.resourceHandler(body, uri);
        returnBody.packageType = "messageResponse";
        returnBody.appData = { resultData };
        // 回消息
        if (panel) {
          await panel.webview.postMessage(returnBody);
        }
        break;
      case "viewPageRequest": {
        // eslint-disable-next-line no-case-declarations
        const { workspaceFolders, appId, pageFile } = body.appData;
        const appFolder = `${workspaceFolders as string}/${appId as string}`;
        const devCommand = "npm run dev"; // ConfigUtil.readPackageJsonDevCommand(appFolder);
        // 启动项目，并且在一个新的 webview 中打开 pageId
        // 运行项目下的 package.json 中的 scripts.start
        if (devCommand) {
          // 运行该命令
          const t1 = vscode.window.createTerminal({ name: "启动项目", message: "启动项目", cwd: appFolder });
          t1.show(false);
          t1.sendText(devCommand as string);
          // 在一个新的 webview 中打开网址
          const webview = vscode.window.createWebviewPanel("jianghu", "jianghu", vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
          });
          webview.webview.html = `<iframe src="https://www.163.com" width="100% height="100%"></iframe>`;
          // webview 打开一个链接
        }
        break;
      }
      default:
        break;
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

  // 处理 resource的请求
  private async resourceHandler(body: any, uri: any) {
    const { appId, currDatabase: database } = uri;
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
    return resultData;
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
