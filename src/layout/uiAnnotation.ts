// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from "path";
import * as vscode from "vscode";
import CommonService from "../service/common";
import Logger from "../util/logger";

// this method is called when your extension is deactivated
export function deactivate() {
  console.log("您的扩展“vscode-plugin-demo”已被释放！");
}

async function updateAnnotation(activeEditor: vscode.TextEditor, { pageId, actionId, pageName, currDatabase }: any): Promise<void> {
  const extname = path.extname(activeEditor.document.uri.fsPath);
  if (extname !== ".html") {
    return;
  }
  const basename = path.basename(activeEditor.document.uri.fsPath);
  const activePageId = basename.split(".")[0];
  if (activePageId !== pageId) {
    Logger.showError("请打开对应html page文件");
    void vscode.window.showErrorMessage("请打开对应html page文件");
    return;
  }
  const isPage = path.join(activeEditor.document.uri.fsPath).includes("\\page\\") || path.join(activeEditor.document.uri.fsPath).includes("/page/");
  const commonService = new CommonService();
  const { ui: uiActionList }: { ui: any[] } = await commonService.getCacheData(currDatabase);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const regEx = /\/\*[\s\S]*?\*\//g;
  const action = /uiActionId:\s*?(\w+)/;
  const text = activeEditor.document.getText();
  const matchArr: any[] = [];
  let mat: any;
  const res = text.matchAll(regEx);
  while ((mat = regEx.exec(text))) {
    matchArr.unshift(mat);
  }
  for (const match of matchArr) {
    const annotation: string = match[0];
    const uiActionAnnotation = action.exec(annotation);
    const uiActionId = uiActionAnnotation ? uiActionAnnotation[1] : null;
    if (!uiActionId) {
      continue;
    }
    const uiExists = isPage
      ? uiActionList.find((e: { uiActionId: string; pageId: string }) => e.uiActionId === uiActionId && e.pageId === pageId)
      : uiActionList.find((e: { uiActionId: any }) => e.uiActionId === uiActionId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const startPos = activeEditor.document.positionAt(match.index);
    const endPos = activeEditor.document.positionAt(+match.index + +annotation.length);
    if (uiExists) {
      let copyStr = "";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const uiActionConfig = JSON.parse(uiExists.uiActionConfig || "{}");
      const before = uiActionConfig.before
        ? `
* before: ${JSON.stringify(uiActionConfig.before)}`
        : "";
      const after = uiActionConfig.after
        ? `
* after:  ${JSON.stringify(uiActionConfig.after)}`
        : "";
      copyStr = `/** 
* uiActionId: ${uiActionId}
* description: ${uiExists.desc as string}${before}
* main:   ${JSON.stringify(uiActionConfig.main)}${after}
*/`;
      try {
        await activeEditor.insertSnippet(new vscode.SnippetString(copyStr), new vscode.Range(startPos, endPos));
      } catch (e) {
        console.log("err");
        continue;
        // todo
      }
    } else {
      Logger.showError("该UiAction不存在");
    }
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext, page: any) {
  const collection = vscode.languages.createDiagnosticCollection("htmlDiagnostic");
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    void updateAnnotation(activeEditor, page);
  }
}
