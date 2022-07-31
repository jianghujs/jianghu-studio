import * as vscode from "vscode";

// 管理 webview
export default class WebviewManager {
  // todo 销毁时删除 webview
  // todo 多个 webview 情况
  private webviewMap: { [key: string]: vscode.WebviewPanel };
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.webviewMap = {};
  }

  public registerWebview(pageId: string, webview: vscode.WebviewPanel) {
    this.webviewMap[pageId] = webview;
  }

  public getPanel(pageId: string) {
    return this.webviewMap[pageId];
  }
  public del({ pageId, request }: { pageId: string | undefined; request: any }): void {
    if (!pageId) {
      pageId = request.body.appData.pageId;
    }
    const panel = this.getPanel(pageId as string);
    panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
    delete this.webviewMap[pageId as string];
  }
}
