import { Knex } from "knex";
import * as vscode from "vscode";
import AppCore from "../core";
import pageList from "../table/_page";
import { PathUtil } from "../util/pathUtil";
import { EntryItem } from "./tree/entryItem";

export default abstract class PageWebview {
  public static currentPanel: vscode.WebviewPanel | PageWebview | undefined;
  private static core: AppCore;

  private core: AppCore;

  private disposables: vscode.Disposable[] = [];
  private uri: any;

  constructor(core: AppCore) {
    this.core = core;
  }

  public active(context: vscode.ExtensionContext) {
    for (const pageData of pageList) {
      context.subscriptions.push(
        // 注册参数
        vscode.commands.registerCommand(pageData.command, uri => {
          this.uri = uri;
          console.log("uri", uri, pageData);
          const { pageId, currDatabase: database, pageName, args } = this.uri;
          const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
          const panelExist = this.core.webviewManager.getPanel(pageData.page);
          const workspaceFolders = this.getWorkFolder();
          if (panelExist) {
            this.updateForPage(context, panelExist, {
              appId: uri.appId,
              pageId,
              pageName,
              database,
              page: pageData.page,
              projectInfo: args,
              workspaceFolders,
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
            appId: uri.appId,
            pageId,
            pageName,
            database,
            page: pageData.page,
            projectInfo: args,
            workspaceFolders,
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
      appId,
      pageId,
      pageName,
      database,
      page,
      projectInfo,
      workspaceFolders,
    }: {
      appId: string;
      pageId: string;
      pageName: string;
      page: string;
      database: Knex.MySqlConnectionConfig;
      projectInfo: EntryItem;
      workspaceFolders: any;
    }
  ): void {
    panel.title = `${pageName}${(projectInfo && `@${projectInfo.appTitle as string}`) || ""}`;
    const uiActionList = this.core.tableManager.getUiActionList(pageId);
    panel.webview.html = "";
    panel.webview.html = PathUtil.generatePage(context, panel, page, { pageId: pageId || "", appId, workspaceFolders, uiActionList, database: database?.database });
  }

  // 页面打开后，想页面发送当前工作目录
  private getWorkFolder() {
    // 向页面中发送基础数据
    const workspaceFile = vscode.workspace.workspaceFile && vscode.workspace.workspaceFile.path;
    const workspaceFolderList: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
    let workspaceFolders: any;
    if (workspaceFile) {
      // 工作区
      workspaceFolders = [PathUtil.getWorkspaceFileDir(workspaceFile)];
    } else {
      // 普通文件夹
      workspaceFolders = workspaceFolderList && PathUtil.getRootFloader(workspaceFolderList);
    }
    return workspaceFolders;
  }
}
