import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import filters from "../view/extend/filter";
import Logger from "./logger";
import nunjucks = require("nunjucks");

export class PathUtil {
  public static generatePage(context: vscode.ExtensionContext, page: string, locals: object = {}): string {
    const pagePath = this.getExtensionFileAbsolutePath(context, `src/view/page/${page}.html`);
    const rootPath = this.getExtensionFileAbsolutePath(context, "src/view");
    Logger.info("pagePath", pagePath);
    const dirPath = path.dirname(pagePath);
    // 渲染变量
    const fileLoader = new nunjucks.FileSystemLoader(rootPath);
    const option = {
      cache: false,
      tags: { variableStart: "<$", variableEnd: "$>" },
    };
    const env = new nunjucks.Environment(fileLoader, option);

    // filter
    for (const key of Object.keys(filters)) {
      env.addFilter(key, filters[key]);
    }

    let html = env.render(pagePath, locals);

    // vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
    html = html.replace(
      /(<link.+?href="|<script.+?src="|<img.+?src="|<v-img.+?src=")(.+?)"/g,
      (m: any, $1: any, $2: any) =>
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        $1 +
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: "vscode-resource" }).toString() +
        '"'
    );
    return html;
  }
  /**
   * 获取当前所在工程根目录，有3种使用方法：<br>
   * getProjectPath(uri) uri 表示工程内某个文件的路径<br>
   * getProjectPath(document) document 表示当前被打开的文件document对象<br>
   * getProjectPath() 会自动从 activeTextEditor 拿document对象，如果没有拿到则报错
   * @param {*} document
   */
  public static getProjectPath(document: any): string {
    if (!document) {
      document = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
    }
    if (!document) {
      Logger.showError("当前激活的编辑器不是文件或者没有文件被打开！");
      return "";
    }
    const currentFile: string = (document.uri ? document.uri : document).fsPath;
    let projectPath = null;
    let workspaceFolders = vscode.workspace.workspaceFolders?.map((item: any) => item.uri.path as string);
    // 由于存在Multi-root工作区，暂时没有特别好的判断方法，先这样粗暴判断
    // 如果发现只有一个根文件夹，读取其子文件夹作为 workspaceFolders
    if (workspaceFolders && workspaceFolders.length === 1 && workspaceFolders[0] === vscode.workspace.rootPath) {
      const rootPath = workspaceFolders[0];
      const files = fs.readdirSync(rootPath);
      workspaceFolders = files.filter((name: string) => !/^\./g.test(name)).map((name: string) => path.resolve(rootPath, name));
      // vscode.workspace.rootPath会不准确，且已过时
      // return vscode.workspace.rootPath + '/' + this._getProjectName(vscode, document);
    }
    workspaceFolders?.forEach((folder: string) => {
      if (currentFile.indexOf(folder) === 0) {
        projectPath = folder;
      }
    });
    if (!projectPath) {
      Logger.showError("获取工程根路径异常！");
      return "";
    }
    return projectPath;
  }

  /**
   * 获取当前工程名
   */
  public static getProjectName(projectPath: string) {
    return path.basename(projectPath);
  }

  /**
   * 获取某个扩展文件绝对路径
   * @param context 上下文
   * @param relativePath 扩展中某个文件相对于根目录的路径，如 images/test.jpg
   */
  public static getExtensionFileAbsolutePath(context: any, relativePath: string): string {
    return path.join(context.extensionPath as string, relativePath);
  }

  /**
   * 获取某个扩展文件相对于webview需要的一种特殊路径格式
   * 形如：vscode-resource:/Users/toonces/projects/vscode-cat-coding/media/cat.gif
   * @param context 上下文
   * @param relativePath 扩展中某个文件相对于根目录的路径，如 images/test.jpg
   */
  public static getExtensionFileVscodeResource(context: any, relativePath: string) {
    const diskPath = vscode.Uri.file(path.join(context.extensionPath as string, relativePath));
    return diskPath.with({ scheme: "vscode-resource" }).toString();
  }

  public static isDir(p: string) {
    const stat = fs.lstatSync(p);
    return stat.isDirectory();
  }
}
