/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { TableEnum } from "../common/constants";
import JianghuKnexManager from "../core/jianghuKnexManager";
import BaseService from "./base";

// test
export default class CommonService extends BaseService {
  private terminalTerminal: vscode.Terminal | null = null;
  public refreshDbList(ctx: any) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    vscode.commands.executeCommand("constructionPlan.refreshDb");
  }
  public async savePlanToFile(jianghuKnex: any, { database }: any) {
    const resource = await jianghuKnex(TableEnum._resource).select();
    const ui = await jianghuKnex(TableEnum._ui).select();
    const fileName = `${database as string}-plan.json`;
    const dir = path.join(__filename, "..", "..", "cache");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify({ resource, ui }));
    return { resource, ui };
  }
  public async getCacheData(database: any) {
    const cacheDataDir = path.join(__filename, "..", "..", "cache", `${database.database as string}-plan.json`);
    if (!fs.existsSync(cacheDataDir)) {
      new JianghuKnexManager();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.savePlanToFile(JianghuKnexManager.client(database), database);
    } else {
      return JSON.parse(fs.readFileSync(cacheDataDir, "utf-8") || '{"resource": [], "ui": []}');
    }
  }
  public runInstall(ctx: any) {
    console.log(ctx);
    const {
      database: { dir },
    } = ctx.app;
    const { value }: any = ctx.request.body.appData.actionData;
    if (!value) {
      return;
    }
    const terminalA = this.getTerminal(dir as string);
    // terminalA.show(true);
    terminalA.sendText(`jianghu-init ${value as string}`); // 输入命令
  }
  public getTerminal(dir: string) {
    if (this.terminalTerminal) {
      this.terminalTerminal.dispose();
    }
    this.terminalTerminal = vscode.window.createTerminal({ name: "模板创建", message: "打开测试终端", cwd: dir });
    this.terminalTerminal.show(true);
    return this.terminalTerminal;
  }
}
