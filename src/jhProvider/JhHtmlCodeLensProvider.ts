import * as vscode from "vscode";

export class JhHtmlCodeLensProvider implements vscode.CodeLensProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
    // 创建一个 CodeLens 数组
    const lenses: vscode.CodeLens[] = [];
    // 添加组件：右侧弹出组件列表；点击后，自动添加到指定位置
    // 遍历文档的每一行
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);

      // doUiAction 管理：
      // 列出该 action的所有方法，点击后跳转编辑；
      if (line.text.includes("doUiAction(") && !line.text.includes("async doUiAction(")) {
        const range = new vscode.Range(i, 0, i, 0);
        const command = {
          title: "DoUiAction 管理",
          command: "jhExtension.showJhPanel", // 当用户点击这个 CodeLens 时执行的命令
          arguments: [range.start, "doUiActionManager"],
        };
        const lens = new vscode.CodeLens(range, command);
        lenses.push(lens);
      }
      // Resource 流程管理：
      // 列出数据库对应的 resource 数据，点击后可编辑；
      // 列出相关 service位置，点击后直接跳转编辑；
      if (line.text.includes("jianghuAxios(")) {
        const range = new vscode.Range(i, 0, i, 0);
        const command = {
          title: "Resource 流程管理",
          command: "jhExtension.showJhPanel", // 当用户点击这个 CodeLens 时执行的命令
          arguments: [range.start, "resourceManager"],
        };
        const lens = new vscode.CodeLens(range, command);
        lenses.push(lens);
      }
    }

    return lenses;
  }
}
