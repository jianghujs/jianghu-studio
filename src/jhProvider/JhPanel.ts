import * as vscode from "vscode";
import { PathUtil } from "../util/pathUtil";

export class JhPanel {
  public static jhPanelSaveStatus: Map<string, boolean>;
  public static jhPanel: Map<string, vscode.WebviewPanel>;
  protected activeUriPath: string | undefined;
  protected hasDesignBtnPageList: string[] = [];
  protected context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // 注册命令；打开文件时
    vscode.window.onDidChangeActiveTextEditor((editor: any) => {
      if (!editor) {
        void vscode.commands.executeCommand("setContext", "openJianghuDesign", false);
        return;
      }
      if (this.activeUriPath !== editor?.document.uri.path) {
        // if (JhPanel.jhPanel) {
        //   JhPanel.jhPanel.dispose();
        //   JhPanel.jhPanel = undefined;
        // }
      }
      const document = editor?.document;
      this.checkIsJhHtmlPage(document);
    });
  }

  // 检查是否要显示可视化设计按钮
  protected checkIsJhHtmlPage(document: any) {
    if (!document) {
      return;
    }
    if (this.hasDesignBtnPageList.includes(document.uri.path as string)) {
      void vscode.commands.executeCommand("setContext", "openJianghuDesign", true);
      return;
    }
    if (this.activeUriPath === document.uri.path) {
      return;
    }
    this.activeUriPath = document.uri.path;
    const isJhProject = PathUtil.checkIsJhProject(document);

    if (!(document.languageId === "html" && isJhProject)) {
      void vscode.commands.executeCommand("setContext", "openJianghuDesign", false);
      // if (JhPanel.jhPanel) {
      //   JhPanel.jhPanel.dispose();
      //   JhPanel.jhPanel = undefined;
      // }
      return;
    }
    // 打开HTML文件时，显示你的按钮
    const isJhHtmlPage = PathUtil.checkIsJhHtmlPage(document);
    // 如果是 page/html 文件，打开页面设计
    if (isJhHtmlPage) {
      void vscode.commands.executeCommand("setContext", "openJianghuDesign", true);
      this.hasDesignBtnPageList.push(document.uri.path as string);
    }
  }
}
