import * as vscode from "vscode";
import { JhSelectionCodeLensProvider } from "./JhSelectionCodeLensProvider";
import { JhHtmlCodeLensProvider } from "./JhHtmlCodeLensProvider";
// eslint-disable-next-line import/no-extraneous-dependencies
import * as cheerio from "cheerio";
import { JhPanel } from "./JhPanel";
import { CommonUtil } from "../util/commonUtil";

export class JhPanelFromPosition extends JhPanel {
  private jhProvider: JhHtmlCodeLensProvider | undefined;
  private jhSelectionProvider: JhSelectionCodeLensProvider | undefined;

  constructor(context: vscode.ExtensionContext) {
    super(context);
    this.init();
  }

  private init() {
    this.jhProvider = new JhHtmlCodeLensProvider();
    this.jhSelectionProvider = new JhSelectionCodeLensProvider();
    this.context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file", language: "html" }, this.jhProvider));
    this.context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file", language: "html" }, this.jhSelectionProvider));
    // 光标位置变化时，刷新CodeLens
    this.context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(e => {
        JhSelectionCodeLensProvider.currentLine = e.selections[0].start.line;
        this.jhSelectionProvider?.refresh();
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          void vscode.commands.executeCommand("setContext", "openJianghuDesign", false);
          return;
        }
        this.checkIsJhHtmlPage(editor?.document);
      })
    );

    // code lens 的 插入组件按钮
    this.context.subscriptions.push(
      vscode.commands.registerCommand("jhExtension.insertLineBelow", (position: vscode.Position) => {
        console.log("插入代码到指定位置", position);
        // const editor = vscode.window.activeTextEditor;
        // if (editor) {
        //   const newPosition = position.with(position.line + 1, 0); // 在 CodeLens 的位置下面创建一个新的位置
        //   const html = "<div>\n\t<h1>Title</h1>\n\t<p>This is a paragraph.</p>\n</div>\n"; // 这是你想插入的 HTML 代码
        //   void editor.edit(editBuilder => {
        //     editBuilder.insert(newPosition, html); // 在新的位置插入 HTML 代码
        //   });
        // }
      })
    );

    // code lens 的 可视化按钮
    this.context.subscriptions.push(
      vscode.commands.registerCommand("jhExtension.showJhPanel", (position: vscode.Position, codeLensType: string) => {
        // 处理 code lens 过来的参数
        console.log("codeLensType code lens 过来的参数", codeLensType);
      })
    );
  }

  // 根据提取到的组件内容，提取组件的数据
  private pickerData(tagHtml: string): any {
    const regex = /v-model="([\w.]+)"|:(\w+)="([\w.]+)"|v-for="\(([\w]+), [\w]+\)\s+in\s+([\w.]+)"/g;
    let match;
    const attributeNames = [];

    while ((match = regex.exec(tagHtml)) !== null) {
      if (match[1]) {
        attributeNames.push({ directive: "v-model", variable: match[1] });
      } else if (match[2] && match[3]) {
        attributeNames.push({ directive: match[2], variable: match[3] });
      } else if (match[4] && match[5]) {
        attributeNames.push({ directive: "v-for", variable: match[5] });
      }
    }
    console.log("attributeNames", attributeNames);
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (!document) {
      return {};
    }
    let result = "\n";
    const fullText = document.getText();
    const $ = cheerio.load(fullText);
    const scriptContent = $("script").eq(1).html();
    if (!scriptContent) {
      return {};
    }
    const regex1 = /data:\s*\(\)\s*=>\s*\({0,1}([^)]*)\){0,1}/s;
    const regex2 = /data:\s*\(\)\s*=>\s*\{\s*return\s*\({0,1}([^)]*)\){0,1}\s*\}/s;
    let matchData = scriptContent.match(regex1);
    let dataContent = null;
    if (matchData) {
      dataContent = matchData[1];
    } else {
      matchData = scriptContent.match(regex2);
      if (matchData) {
        dataContent = matchData[1];
      } else {
        console.log("No match");
      }
    }

    let dataJson: any = {};
    if (dataContent) {
      dataContent = dataContent.replace(/window.innerWidth < 500/g, "`window.innerWidth < 500`");
      dataJson = eval(`(${dataContent})`);
      console.log("json", dataJson);
    }
    // 将文本分割成行
    attributeNames.forEach(item => {
      const variable = item.variable.split(".")[0];
      const variableValue = CommonUtil.handleValue(dataJson[variable]);
      result += `${variable}: ${JSON.stringify(variableValue)},\n`;
      console.log("result", result);
    });
    return result;
  }

  // 根据光标的位置。提取当前组件闭合内容
  private pickerComponent(rangeStart: vscode.Position, lineText: any): any {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (document) {
      const startTag = (lineText as string).split(" ")[0];
      const endTag = startTag.replace("<", "</") + ">";
      console.log("startTag", startTag, endTag);

      const fullText = document.getText();
      // 将文本分割成行
      const lines = fullText.split("\n");
      // 找到包含你的字符串的行
      const lineIndex = lines.findIndex(line => line.includes('<div id="app"></div>'));
      const textRange = new vscode.Range(rangeStart, document.lineAt(lineIndex).range.end);
      const rangeText = document.getText(textRange);
      const cheerioo = cheerio.load(rangeText);
      const tagHtml = cheerioo(`${startTag.substring(1)}`)
        .first()
        .prop("outerHTML");
      const textLens = (tagHtml as string).split("\n").length;
      // console.log("tagHtml", tagHtml, (tagHtml as string).split("\n").length);
      const replaceRange = new vscode.Range(rangeStart, new vscode.Position(rangeStart.line + textLens, 0));
      // void editor?.edit(editBuilder => {
      //   void editBuilder.replace(replaceRange, "测试下\n");
      // });
      return { tagHtml: tagHtml as string, replaceRange };
    }
    return {};
  }
}
