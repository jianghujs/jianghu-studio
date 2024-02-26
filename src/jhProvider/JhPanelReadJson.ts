/* eslint-disable import/no-extraneous-dependencies */
import * as vscode from "vscode";
import { JhPanel } from "./JhPanel";
import { PathUtil } from "../util/pathUtil";
import AppManager from "../core/appManager";
import * as dayjs from "dayjs";

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
        this.openPageDesignFromJson(editor, panelId);
      })
    );
  }

  private openPageDesignFromJson(editor: vscode.TextEditor, panelId: string) {
    const projectPath = PathUtil.getProjectPath(editor?.document);
    const activeFile = editor?.document.uri.path;
    const webPageId = activeFile.split("/").pop()?.split(".")[0] as string;
    const { appId } = PathUtil.getConfigJson(`${projectPath}/config/config.default.js`);
    const currDatabase = AppManager.handlerMap.get(appId as string)?.currDatabase;
    const jsonPath = `${projectPath}/app/view/init-json/page/${webPageId}.js`;
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
