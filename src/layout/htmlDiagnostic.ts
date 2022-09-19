// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from "path";
import * as vscode from "vscode";
import { Constants } from "../common/constants";
import constructionPlanCore from "../core";
import { ConstructionPlanViewPagePlanList } from "../layout/constructionPlanViewPagePlanList";
import CommonService from "../service/common";

// this method is called when your extension is deactivated
export function deactivate() {
  console.log("您的扩展“vscode-plugin-demo”已被释放！");
}

async function updateDiagnostics(activeEditor: vscode.TextEditor, collection: vscode.DiagnosticCollection): Promise<void> {
  const extname = path.extname(activeEditor.document.uri.fsPath);
  if (extname !== ".html") {
    return;
  }
  const basename = path.basename(activeEditor.document.uri.fsPath);
  const dbData: { list: any[] } | undefined = vscode.workspace.getConfiguration(Constants.CONFIG_PREFIX).get("databaseList");
  const dbList = dbData && dbData.list ? dbData.list : [];
  if (!dbList || !dbList.length) {
    collection.clear();
    return;
  }
  const currDatabase = dbList.find((e: { dir: string }) => activeEditor.document.uri.fsPath.includes(e.dir));
  if (currDatabase) {
    const isPage = path.join(activeEditor.document.uri.fsPath).includes("\\page\\") || path.join(activeEditor.document.uri.fsPath).includes("/page/");
    const pageId = basename.split(".")[0];
    const commonService = new CommonService();
    const cacheData = await commonService.getCacheData(currDatabase);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const uiActionList: any[] = cacheData.ui;
    const resourceList: any[] = cacheData.resource;
    const regEx = /(?<=doUiAction\(\s?('|"))(.*?)(?=('|")\s?(,\s?.*?\s?)?\))/g; // doUiAction('start', ...) => start
    const resourceRegEx = /(?<=jianghuAxios\(([\s\S]*?)actionId:\s+?['"])(.*)(?=('|"))/g; // doUiAction('start', ...) => start
    const text = activeEditor.document.getText();
    let match: any;
    const range = [];
    collection.clear();
    while ((match = regEx.exec(text))) {
      const uiExists = isPage
        ? uiActionList.find((e: { uiActionId: string; pageId: string }) => e.uiActionId === match[0] && e.pageId === pageId)
        : uiActionList.find((e: { uiActionId: any }) => e.uiActionId === match[0]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const startPos = activeEditor.document.positionAt(match.index);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const endPos = activeEditor.document.positionAt(parseInt(match.index, 10) + parseInt(match[0].length, 10));
      if (!uiExists && !/doUiAction(\s+)?\(\w+,\s?\w+\)(\s+)?{/gm.test(text)) {
        range.push({
          code: "",
          message: "Missing uiActionId, please add it",
          range: new vscode.Range(startPos, endPos),
          severity: vscode.DiagnosticSeverity.Error,
          source: "",
          // relatedInformation: [
          // 	new vscode.DiagnosticRelatedInformation(new vscode.Location(activeEditor.document.uri, new vscode.Range(new vscode.Position(1, 8), new vscode.Position(1, 9))), 'first assignment to `x`')
          // ]
        });
      }
    }

    while ((match = resourceRegEx.exec(text))) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const findPageId = text.substring(match.index - 100, match.index).match(/(?<=pageId([\s\S]*?)('|"))(.*?)(?=('|"))/);
      // @ts-ignore
      const resourceExists = resourceList.find(e => e.pageId === findPageId[0] && e.actionId === match[0]);
      if (resourceExists) {
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const startPos = activeEditor.document.positionAt(match.index);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const endPos = activeEditor.document.positionAt(parseInt(match.index, 10) + parseInt(match[0].length, 10));
      range.push({
        code: "",
        message: "Missing resource actionId, please add it",
        range: new vscode.Range(startPos, endPos),
        severity: vscode.DiagnosticSeverity.Error,
        source: "",
        // relatedInformation: [
        // 	new vscode.DiagnosticRelatedInformation(new vscode.Location(activeEditor.document.uri, new vscode.Range(new vscode.Position(1, 8), new vscode.Position(1, 9))), 'first assignment to `x`')
        // ]
      });
    }
    collection.set(activeEditor.document.uri, range);
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext, core: constructionPlanCore) {
  const collection = vscode.languages.createDiagnosticCollection("htmlDiagnostic");
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    void updateDiagnostics(activeEditor, collection);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      activeEditor = editor;
      if (editor) {
        void updateDiagnostics(editor, collection);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        vscode.window.registerTreeDataProvider("constructionPlanView", new ConstructionPlanViewPagePlanList(core));
      }
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(
      event => {
        if (activeEditor && event.document === activeEditor.document) {
          void updateDiagnostics(activeEditor, collection);
        }
      },
      null,
      context.subscriptions
    )
  );
}
