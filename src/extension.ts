/* eslint-disable @typescript-eslint/restrict-template-expressions */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Knex } from "knex";
import * as vscode from "vscode";
import { TableEnum } from "./common/constants";
import constructionPlanCore from "./core";
import JianghuKnexManager from "./core/jianghuKnexManager";
import { ConstructionAdvancedPageList } from "./layout/constructionAdvancedPageList";
import { ConstructionPlanPageList } from "./layout/constructionPlanPageList";
import { ConstructionPlanViewPagePlanList } from "./layout/constructionPlanViewPagePlanList";
import * as htmlDiagnostic from "./layout/htmlDiagnostic";
import TestWebview from "./layout/pageWebview";
import * as uiAnnotation from "./layout/uiAnnotation";
import { CommonUtil } from "./util/commonUtil";
import Logger from "./util/logger";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log("---------------");
  const core: constructionPlanCore = new constructionPlanCore();
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  new TestWebview(core).active(context);
  htmlDiagnostic.activate(context, core);

  // 打开首页
  void vscode.commands.executeCommand("extension.setting.showIndexPage", { pageId: "index", currDatabase: null, pageName: "首页" });

  vscode.window.registerTreeDataProvider("constructionPlanView", new ConstructionPlanViewPagePlanList(core));
  vscode.window.registerTreeDataProvider("constructionPlan", new ConstructionPlanPageList(core));
  vscode.window.registerTreeDataProvider("constructionAdvanced", new ConstructionAdvancedPageList(core));

  context.subscriptions.push(
    vscode.commands.registerCommand("constructionPlan.refreshDb", () => {
      vscode.window.registerTreeDataProvider("constructionPlan", new ConstructionPlanPageList(core));
      vscode.window.registerTreeDataProvider("constructionAdvanced", new ConstructionAdvancedPageList(core));
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("constructionPlan.pageDelete", ({ label, pageId, currDatabase }: { label: string; pageId: string; currDatabase: Knex.MySqlConnectionConfig }) => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      CommonUtil.confirm(`Are you want to delete Page ${label} ? `, async () => {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await JianghuKnexManager.client(currDatabase)(TableEnum._page).where({ pageId }).delete();
        void vscode.commands.executeCommand("constructionPlan.refreshDb");
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("constructionPlanView.copySample", async uri => {
      const { pageId, pageName, currDatabase }: { pageId: any; pageName: string; currDatabase: Knex.MySqlConnectionConfig } = uri;
      let copyStr = "";
      if (pageName === "Resource") {
        copyStr = `const { data: { appData: { resultData: { rows } } } } = await window.jianghuAxios({
          data: {
            appData: {
              pageId: "${pageId.pageId as string}",
              actionId: "${pageId.actionId as string}",
              where: {},
              actionData: {}
            },
          },
        });`;
      } else {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const ui = await JianghuKnexManager.client(currDatabase)(TableEnum._ui).where("uiActionId", pageId.actionId).first();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const uiActionConfig = JSON.parse(ui.uiActionConfig || "{}");
        const before = uiActionConfig.before
          ? `
 * before: ${JSON.stringify(uiActionConfig.before)}`
          : "";
        const after = uiActionConfig.after
          ? `
 * after:  ${JSON.stringify(uiActionConfig.after)}`
          : "";
        copyStr = `
/** 
 * uiActionId:  ${pageId.actionId}
 * description: ${ui.desc}${before}
 * main:   ${JSON.stringify(uiActionConfig.main)}${after}
*/`;
      }
      void vscode.env.clipboard.writeText(copyStr);
      Logger.showInfo("已复制代码块到剪切板");
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("constructionPlanView.replaceSample", async uri => {
      const { pageId, pageName, currDatabase }: { pageId: any; pageName: string; currDatabase: Knex.MySqlConnectionConfig } = uri;
      if (pageName === "UiAction") {
        uiAnnotation.activate(context, { pageId, actionId: pageId.actionId, pageName, currDatabase });
      }
    })
  );
}

// // this method is called when your extension is deactivated
export function deactivate() {
  // do samething
}
