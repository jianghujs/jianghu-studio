import * as vscode from "vscode";
import AppCore from "../core";
import { PathUtil } from "../util/pathUtil";
import { JhHtmlCodeLensProvider } from "./JhHtmlCodeLensProvider";
import { JhSelectionCodeLensProvider } from "./JhSelectionCodeLensProvider";

export class JhPanel {
  private context: vscode.ExtensionContext;
  private core: AppCore;
  private jhPanel: vscode.WebviewPanel | undefined;
  private jhProvider: JhHtmlCodeLensProvider | undefined;
  private jhSelectionProvider: JhSelectionCodeLensProvider | undefined;

  constructor(context: vscode.ExtensionContext, core: AppCore) {
    this.context = context;
    this.core = core;
    this.init();
    this.activate();
  }

  private init() {
    this.jhProvider = new JhHtmlCodeLensProvider();
    this.jhSelectionProvider = new JhSelectionCodeLensProvider();
    this.context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file", language: "html" }, this.jhProvider));
    this.context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file", language: "html" }, this.jhSelectionProvider));
  }

  private activate() {
    // 插入代码到指定位置
    this.context.subscriptions.push(
      vscode.commands.registerCommand("jhExtension.insertLineBelow", (position: vscode.Position) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const newPosition = position.with(position.line + 1, 0); // 在 CodeLens 的位置下面创建一个新的位置
          const html = "<div>\n\t<h1>Title</h1>\n\t<p>This is a paragraph.</p>\n</div>\n"; // 这是你想插入的 HTML 代码
          void editor.edit(editBuilder => {
            editBuilder.insert(newPosition, html); // 在新的位置插入 HTML 代码
          });
        }
      })
    );
    // 光标位置变化时，刷新CodeLens
    this.context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(e => {
        JhSelectionCodeLensProvider.currentLine = e.selections[0].start.line;
        this.jhSelectionProvider?.refresh();
      })
    );
    // 注册命令；打开右侧 panel
    this.context.subscriptions.push(
      vscode.commands.registerCommand("jhExtension.showJhPanel", () => {
        void vscode.window.showInformationMessage("You clicked on a CodeLens!");
        if (this.jhPanel) {
          this.jhPanel.reveal(vscode.ViewColumn.Beside);
          return;
        }
        // 创建一个新的Webview Panel
        this.jhPanel = vscode.window.createWebviewPanel(
          "jhPanel", // 类型
          "Jh Panel", // 标题
          vscode.ViewColumn.Beside, // 显示在编辑器的哪一侧
          {
            enableScripts: true, // 启用JS，默认禁用
          } // Webview选项
        );

        // 在Webview Panel中显示你的内容
        this.jhPanel.webview.html = this.getWebviewContent();
        this.jhPanel.onDidDispose(() => {
          this.jhPanel = undefined;
        });
      })
    );
    // 注册命令；打开文件时
    vscode.workspace.onDidOpenTextDocument(document => {
      // this.context.subscriptions.push(
      //   vscode.window.onDidChangeTextEditorSelection(e => {
      //     if (e.selections.length > 0) {
      //       const selection = e.selections[0];
      //       const text = e.textEditor.document.getText(selection);

      //       // 这里是你的代码，你可以根据选中的内容来执行特定的操作
      //       void vscode.window.showInformationMessage("Selected text: " + text);
      //     }
      //   })
      // );
      if (document.languageId === "html") {
        const isProject = PathUtil.checkIsJhProject(document);
        console.log("appPath", isProject);
        if (isProject) {
          // 打开HTML文件时，显示你的按钮
          // void vscode.commands.executeCommand("setContext", "showJhPanelBtn", true);
          // if (!this.jhPanel) {
          //   void vscode.commands.executeCommand("jhExtension.showJhPanel");
        } else {
          // void vscode.commands.executeCommand("setContext", "showJhPanelBtn", false);
          // if (this.jhPanel) {
          //   this.jhPanel.dispose();
          //   this.jhPanel = undefined;
          // }
        }
      }
    });

    // vscode.commands.registerCommand("jhExtension.showJhPanel", () => {
    //   if (this.jhPanel) {
    //     this.jhPanel.reveal(vscode.ViewColumn.Beside);
    //     return;
    //   }
    //   // 创建一个新的Webview Panel
    //   this.jhPanel = vscode.window.createWebviewPanel(
    //     "jhPanel", // 类型
    //     "Jh Panel", // 标题
    //     vscode.ViewColumn.Beside, // 显示在编辑器的哪一侧
    //     {
    //       enableScripts: true, // 启用JS，默认禁用
    //     } // Webview选项
    //   );

    //   // 在Webview Panel中显示你的内容
    //   this.jhPanel.webview.html = this.getWebviewContent();
    //   this.jhPanel.onDidDispose(() => {
    //     this.jhPanel = undefined;
    //   });
    // });
  }
  private getWebviewContent(): string {
    return `
        <html>
        <body>
            <h1>Hello, World!</h1>
        </body>
        </html>
    `;
  }
}
