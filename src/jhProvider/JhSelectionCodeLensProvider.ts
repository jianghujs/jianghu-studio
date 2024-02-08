import * as vscode from "vscode";

export class JhSelectionCodeLensProvider implements vscode.CodeLensProvider {
  public static currentLine: number | undefined;
  private onDidChangeCodeLensesEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

  public get onDidChangeCodeLenses(): vscode.Event<void> {
    return this.onDidChangeCodeLensesEmitter.event;
  }

  public refresh(): void {
    void this.onDidChangeCodeLensesEmitter.fire();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
    // 创建一个 CodeLens 数组
    const lenses: vscode.CodeLens[] = [];
    // 添加组件：右侧弹出组件列表；点击后，自动添加到指定位置
    if (JhSelectionCodeLensProvider.currentLine !== undefined) {
      const line = document.lineAt(JhSelectionCodeLensProvider.currentLine);
      const lineText = line.text.trim();
      const notTips = lineText.includes("v-slot") || lineText.startsWith("//") || lineText.startsWith("/*") || lineText.startsWith("*") || lineText.startsWith("*/") || lineText.startsWith("<!--") || lineText.startsWith("</") || lineText.startsWith("<style") || lineText.startsWith("<script");
      if (lineText.startsWith("<") && !notTips) {
        const range = new vscode.Range(JhSelectionCodeLensProvider.currentLine, 0, JhSelectionCodeLensProvider.currentLine, 0);
        const command = {
          title: "插入组件",
          command: "jhExtension.insertLineBelow",
          arguments: [range.start],
        };
        const command2 = {
          title: "可视化设计",
          command: "jhExtension.openPageDesignFromJson",
          arguments: [range.start, lineText],
        };
        const lens = new vscode.CodeLens(range, command);
        const lens2 = new vscode.CodeLens(range, command2);
        lenses.push(lens, lens2);
      }
    }
    // 遍历文档的每一行
    return lenses;
  }
}
