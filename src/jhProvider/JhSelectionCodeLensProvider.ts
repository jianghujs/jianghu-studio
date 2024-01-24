import * as vscode from "vscode";

export class JhSelectionCodeLensProvider implements vscode.CodeLensProvider {
  public static currentLine: number | undefined;
  public onDidChangeCodeLenses: vscode.Event<void> = new vscode.EventEmitter<void>().event;

  public refresh(): void {
    (this.onDidChangeCodeLenses as unknown as vscode.EventEmitter<void>).fire();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
    // 创建一个 CodeLens 数组
    const lenses: vscode.CodeLens[] = [];
    // 添加组件：右侧弹出组件列表；点击后，自动添加到指定位置
    if (JhSelectionCodeLensProvider.currentLine !== undefined) {
      const range = new vscode.Range(JhSelectionCodeLensProvider.currentLine, 0, JhSelectionCodeLensProvider.currentLine, 0);
      const command = {
        title: "添加组件",
        command: "jhExtension.insertLineBelow",
        arguments: [range.start],
      };
      const lens = new vscode.CodeLens(range, command);
      lenses.push(lens);
    }
    // 遍历文档的每一行
    return lenses;
  }
}
