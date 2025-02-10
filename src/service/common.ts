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
    const { value, type }: any = ctx.request.body.appData.actionData;
    if (!value) {
      return;
    }
    const terminalA = this.getTerminal(dir as string);
    // terminalA.show(true);
    const cwd = type === "project" ? `jianghu-init project --type=${value as string}` : "jianghu-init";
    terminalA.sendText(cwd); // 输入命令
  }
  public getTerminal(dir: string, name?: string) {
    if (this.terminalTerminal) {
      this.terminalTerminal.dispose();
    }
    this.terminalTerminal = vscode.window.createTerminal({ name: name || "模板创建", message: "jianghu-init 终端", cwd: dir });
    this.terminalTerminal.show(true);
    return this.terminalTerminal;
  }
  public execute({ dir, execute, name }: any) {
    const terminalA = this.getTerminal(dir as string, name as string);
    terminalA.sendText(execute as string); // 输入命令
  }
}
