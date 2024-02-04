import * as vscode from "vscode";
import { PathUtil } from "../util/pathUtil";
import AppManager from "../core/appManager";
import { JhPanel } from "./JhPanel";

export class JhPanelFromHtml extends JhPanel {
  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.init();
  }

  private init() {
    // 可视化直接使用 html方法入口
    this.context.subscriptions.push(
      vscode.commands.registerCommand("jhExtension.openPageCustomDesign", () => {
        // 完整读取编辑编辑器内容
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }
        const document = editor.document;
        const sourceCode = document.getText();
        const htmlHeadPattern = /{% block htmlHead %}((?!{% block|{% endblock %}).)*{% endblock %}/s;
        const vueTemplatePattern = /{% block vueTemplate %}((?!{% block|{% endblock %}).)*{% endblock %}/s;
        const vueScriptPattern = /{% block vueScript %}((?!{% block|{% endblock %}).)*{% endblock %}/s;
        const htmlHeadMatch: RegExpExecArray | null = htmlHeadPattern.exec(sourceCode);
        const vueTemplatePatternMatch: RegExpExecArray | null = vueTemplatePattern.exec(sourceCode);
        const vueScriptPatternMatch: RegExpExecArray | null = vueScriptPattern.exec(sourceCode);
        // console.log("htmlHeadMatch", htmlHeadMatch);
        // console.log("vueTemplatePatternMatch", vueTemplatePatternMatch);
        // console.log("vueScriptPatternMatch", vueScriptPatternMatch);
        // 按照 njk的标签直接提取内容段，
        // 分别插入到设计页面中去
        // 在进行 njk 编译之前就插入，才能正常编译
        // 编译完成后，njk 标签内容提取出来，并覆盖到源文件中去
        const projectPath = PathUtil.getProjectPath(editor?.document);
        const { appId } = PathUtil.getConfigJson(`${projectPath}/config/config.default.js`);
        const currDatabase = AppManager.handlerMap.get(appId as string)?.currDatabase;
        const activeFile = editor?.document.uri.path;
        const webPageId = activeFile.split("/").pop()?.split(".")[0] as string;
        void vscode.commands.executeCommand("webviewHandler.openPageCustomDesign", {
          appId,
          pageId: "pageCustomDesign",
          currDatabase,
          appDir: projectPath,
          pageName: `[${appId as string} - ${webPageId}]页面设计`,
          htmlContent: {
            htmlHeadMatch: htmlHeadMatch ? htmlHeadMatch[0] : "",
            vueTemplatePatternMatch: vueTemplatePatternMatch ? vueTemplatePatternMatch[0] : "",
            vueScriptPatternMatch: vueScriptPatternMatch ? vueScriptPatternMatch[0] : "",
            projectPath,
          },
          pageInfo: {
            webPageId,
            webPageName: webPageId,
          },
          viewColumn: vscode.ViewColumn.Beside,
        });
      })
    );
  }
}
