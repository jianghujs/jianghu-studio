import { Knex } from "knex";
import * as vscode from "vscode";
import constructionPlanCore from "../core";
import pageList from "../table/_page";
import { PathUtil } from "../util/pathUtil";

export default abstract class PageWebview {
  public static currentPanel: vscode.WebviewPanel | PageWebview | undefined;
  private static core: constructionPlanCore;

  private core: constructionPlanCore;

  private disposables: vscode.Disposable[] = [];
  private uri: any;

  constructor(core: constructionPlanCore) {
    this.core = core;
  }

  public active(context: vscode.ExtensionContext) {
    for (const pageData of pageList) {
      context.subscriptions.push(
        // 注册参数
        vscode.commands.registerCommand(pageData.command, uri => {
          this.uri = uri;
          const { pageId, currDatabase: database, pageName } = this.uri;
          const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
          const panelExist = this.core.webviewManager.getPanel(pageData.page);
          if (panelExist) {
            this.updateForPage(context, panelExist, {
              pageId,
              pageName,
              database,
              page: pageData.page,
            });
            panelExist.reveal(column);
            return;
          }

          const panel = vscode.window.createWebviewPanel(
            pageData.page,
            pageData.title,
            vscode.ViewColumn.One, // 显示在编辑器的哪个部位
            {
              enableScripts: true, // 启用JS，默认禁用
              retainContextWhenHidden: true,
            }
          );

          this.updateForPage(context, panel, {
            pageId,
            pageName,
            database,
            page: pageData.page,
          });

          panel.onDidDispose(() => this.dispose(pageData.page), null, this.disposables);

          panel.webview.onDidReceiveMessage(async (message: any) => {
            await this.core.handleMessage({ body: message, uri: this.uri });
          }, undefined);
          this.core.webviewManager.registerWebview(pageData.page, panel);
        })
      );
    }
  }

  public dispose(pageId: string) {
    this.core.webviewManager.del({ pageId, request: "" });
    // Clean up our resources
    // panel.dispose();

    // while (this.disposables.length) {
    //   const x = this.disposables.pop();
    //   if (x) {
    //     x.dispose();
    //   }
    // }
  }

  public updateForPage(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    {
      pageId,
      pageName,
      database,
      page,
    }: {
      pageId: string;
      pageName: string;
      page: string;
      database: Knex.MySqlConnectionConfig;
    }
  ): void {
    panel.title = `${pageName}@${database.database || ""}`;
    const uiActionList = this.core.tableManager.getUiActionList(pageId);
    panel.webview.html = "";
    panel.webview.html = PathUtil.generatePage(context, page, { pageId: pageId || "", uiActionList, database: database.database });
  }
}
