/* eslint-disable import/no-extraneous-dependencies */
import * as vscode from "vscode";
import { JhPanel } from "./JhPanel";
import { PathUtil } from "../util/pathUtil";
import AppManager from "../core/appManager";
import * as dayjs from "dayjs";
import * as fs from "fs";
import { spawn } from "child_process";

export class JhPanelReadJson extends JhPanel {
  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.init();
  }

  private init() {
    // 可视化使用 json 方法入口
    this.context.subscriptions.push(
      vscode.commands.registerCommand("jhExtension.openPageDesignReadJson", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const panelId = dayjs().format();
        void this.openPageDesignFromJson(editor, panelId);
      })
    );
  }

  private async buildJson(projectPath: string, webPageId: string) {
    return new Promise(resolve => {
      const commandBasic = "node /Users/benshanyue/fsll/projects/jianghujs-script-util/openjianghu01/002.jianghu-init/jianghu-init/bin/jianghu-init.js";
      // const commandBasic = "jianghu-init";
      const commandText = `${commandBasic} json --generateType=json --pageType=jh-page --table=${webPageId} -y`;
      const child = spawn(commandText, [], {
        cwd: projectPath,
        shell: true,
      });
      child.stdout.on("data", (data: string) => {
        console.log(`buildPageFromJson stdout: ${data}`);
        void vscode.window.showInformationMessage(`${data}`);
      });
      child.stderr.on("data", (data: string) => {
        // 创建失败；重新运行
        void vscode.window.showInformationMessage(`${data}`);
      });
      child.on("close", (code: string) => {
        console.log(`buildJson child process exited with code ${code}`);
        // 格式化下处理
        resolve(true);
      });
    });
  }

  private async openPageDesignFromJson(editor: vscode.TextEditor, panelId: string) {
    const projectPath = PathUtil.getProjectPath(editor?.document);
    const activeFile = editor?.document.uri.path;
    const webPageId = activeFile.split("/").pop()?.split(".")[0] as string;
    const { appId } = PathUtil.getConfigJson(`${projectPath}/config/config.default.js`);
    const currDatabase = AppManager.handlerMap.get(appId as string)?.currDatabase;
    const jsonPath = `${projectPath}/app/view/init-json/page/${webPageId}.js`;
    if (!fs.existsSync(jsonPath)) {
      await this.buildJson(projectPath, webPageId);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
    void import(jsonPath).then((pageConfig: any) => {
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
          jsonPath,
          hasHelpDrawer: pageConfig.hasHelpDrawer,
        },
      });
    });
  }
}
