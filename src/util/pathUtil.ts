import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import filters from "../view/extend/filter";
import Logger from "./logger";
import nunjucks = require("nunjucks");
import AppManager from "../core/appManager";

export class PathUtil {
  public static extensionContext: vscode.ExtensionContext;

  public static getJhAppId(projectPath: string) {
    // 提取 projectPath 目录下的 config/config.default.js 文件 中的 appId
    const configPath = path.join(projectPath, "config/config.default.js");
    return new Promise(resolve => {
      void import(configPath).then((config: any) => {
        resolve(config);
      });
    });
  }

  public static getWorkspaceFileDir(workspaceFile: string) {
    return workspaceFile.substring(0, workspaceFile.lastIndexOf("/"));
  }

  public static getRootFloader(workspaceFolders: readonly vscode.WorkspaceFolder[]): string[] {
    const newFolders = [];
    for (const folder of workspaceFolders) {
      const isProject = this.checkIsJhProject(undefined, folder.uri.path);
      if (!isProject) {
        newFolders.push(folder.uri.path);
      }
    }
    return newFolders;
  }

  /**
   * 递归查找[jhconfig]文件，读取 config.default.js
   * @param dir
   * @returns
   */
  public static findProjectConfig(dir: string) {
    const configPath = path.join(dir, "config/config.default.js");
    const packageJsonPath = path.join(dir, "package.json");
    if (this.pathExists(packageJsonPath) && this.pathExists(configPath)) {
      if (!fs.readFileSync(packageJsonPath, "utf-8").includes("@jianghujs/jianghu")) {
        return;
      }
      AppManager.appList.push({ ...this.getConfigJson(configPath), dir });
    } else {
      const dirArray = fs.readdirSync(dir);
      for (const item of dirArray) {
        // 跳过无必要的深层文件夹
        if (!PathUtil.isDir(path.join(dir, item)) || ["app", "logs", "node_modules", "run", "sql", "typings", "upload"].includes(item)) {
          continue;
        }
        this.findProjectConfig(path.join(dir, item));
      }
    }
  }

  /**
   * 获取config.default
   * @param configPath
   * @returns
   */
  public static getConfigJson(configPath: string) {
    const appIdPatter = /const appId = '([^']*)';/;
    const configContent = fs.readFileSync(configPath, "utf-8");
    const appIdMatch: any = configContent.match(appIdPatter);
    const appTitleMatch = configContent.match(/appTitle: '([^']*)',/);
    return {
      appId: appIdMatch && appIdMatch[1],
      appTitle: appTitleMatch && appTitleMatch[1],
    };
  }

  public static pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }
    return true;
  }

  public static checkIsJhHtmlPage(document: any): boolean {
    // /Users/benshanyue/fsll/vscode-work/test01/app/view/page/ceshi.html 判断 .html接回。且上级目录是 /view/page/
    const pagePath = document.uri.path;
    const pageDir = path.dirname(pagePath as string);
    const pageName = path.basename(pagePath as string);
    const isPage = pageName.endsWith(".html") && pageDir.endsWith("/view/page");
    return isPage;
  }

  public static checkIsJhProject(document?: any, projectPath?: string): boolean {
    projectPath = this.getProjectPath(document);
    if (projectPath === "") {
      if (document && document.uri && document.uri.path) {
        projectPath = this.getProjectPath(document);
      }
    }
    if (projectPath === "") {
      return false;
    }
    let isProject = fs.existsSync(path.join(projectPath, "app"));
    isProject = isProject && this.isDir(path.join(projectPath, "app"));
    isProject = isProject && fs.existsSync(path.join(projectPath, "config"));
    isProject = isProject && this.isDir(path.join(projectPath, "config"));
    isProject = isProject && fs.existsSync(path.join(projectPath, "config/config.default.js"));
    isProject = isProject && fs.existsSync(path.join(projectPath, "package.json"));
    return isProject;
  }

  public static generatePage(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, page: string, content: any, locals: object = {}): string {
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
    let html: string;
    if (page === "pageCustomDesign") {
      // eslint-disable-next-line prefer-const
      let { htmlHeadMatch, vueTemplatePatternMatch, vueScriptPatternMatch, projectPath } = content;
      let pageSource = fs.readFileSync(pagePath, "utf-8");
      if (htmlHeadMatch) {
        pageSource = pageSource.replace("{% block htmlHead %}{% endblock %}", `${htmlHeadMatch as string}`);
      }
      if (vueTemplatePatternMatch) {
        pageSource = pageSource.replace("{% block vueTemplate %}{% endblock %}", `${vueTemplatePatternMatch as string}`);
      }
      if (vueScriptPatternMatch) {
        if ((vueScriptPatternMatch as string).includes("{% include")) {
          // rootPath {% include
          const pattern = /{% include ['"](.*?)['"] %}/g;
          const matches = (vueScriptPatternMatch as string).match(pattern);
          matches?.map((match: string) => {
            const extractedPath = match.replace("{% include '", "").replace("' %}", "");
            // console.log(extractedPath); // 输出: common/jianghuJs/fixedTableHeightV4.html
            if (extractedPath) {
              // 检查下指定目录下有没有
              const exists = fs.existsSync(path.join(rootPath, `/${extractedPath}`));
              if (!exists) {
                const componentContent = fs.readFileSync(path.join(projectPath as string, `/app/view/${extractedPath}`), "utf-8");
                vueScriptPatternMatch = (vueScriptPatternMatch as string).replace(match, componentContent);
              }
            }
          });
        }
        pageSource = pageSource.replace("{% block vueScript %}{% endblock %}", `${vueScriptPatternMatch as string}`);
      }
      html = env.renderString(pageSource, locals);
    } else {
      let pageSource = fs.readFileSync(pagePath, "utf-8");
      pageSource = pageSource.replace(/\/\/===\/\//gm, "");
      html = env.renderString(pageSource, locals);
    }

    // vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
    html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const absLocalPath = path.resolve(dirPath, $2);
      const webviewUri = panel.webview.asWebviewUri(vscode.Uri.file(absLocalPath));
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const replaceHref = $1 + webviewUri.toString() + '"';
      return replaceHref;
    });
    html = html.replace(/\/\/===\/\//g, "");
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

  public static deleteFolder(p: string) {
    const stat = fs.lstatSync(p);
    return stat.isDirectory();
  }
}
