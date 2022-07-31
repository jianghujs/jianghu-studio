// 初始化框架核心
import { Knex } from "knex";
import { BizError, ErrorInfo } from "../common/constants";
import Logger from "../util/logger";
import { sqlResource } from "../util/resourceUtil";
import JianghuKnexManager from "./jianghuKnexManager";
import KnexManager from "./knexManager";
import ServiceManager from "./serviceManager";
import TableManager from "./tableManager";
import WebviewManager from "./webviewManager";

export default class constructionPlanCore {
  public tableManager: TableManager;
  public serviceManager: ServiceManager;
  public webviewManager: WebviewManager;
  public knexManager: KnexManager;
  public jianghuKnexManager: JianghuKnexManager;

  constructor() {
    this.tableManager = new TableManager();
    this.serviceManager = new ServiceManager();
    this.webviewManager = new WebviewManager();
    this.jianghuKnexManager = new JianghuKnexManager();
    this.knexManager = new KnexManager();
  }

  public async handleMessage({ body, uri }: any) {
    const { currDatabase: database } = uri;
    const {
      appData: { pageId, actionId },
    } = body;
    const resource = this.tableManager.findResource(pageId as string, actionId as string);
    let resultData: any;

    // database ===> ctx.app.knex
    const app: any = {};
    if (database) {
      app.jianghuKnex = JianghuKnexManager.client(database as Knex.MySqlConnectionConfig);
      app.knex = KnexManager.client(database as Knex.MySqlConnectionConfig);
      app.database = database;
    }
    const ctx = {
      request: { body },
      app: { logger: Logger, ...app },
    };
    if (resource) {
      const {
        resourceHook: { before: beforeHooks, after: afterHooks },
        resourceData,
      }: any = resource;
      if (beforeHooks) {
        for (const beforeHook of beforeHooks) {
          this.serviceFunctionCheck(beforeHook);
          // @ts-ignore
          await this.serviceManager.getServiceMap()[beforeHook.service][beforeHook.serviceFunction](ctx);
        }
      }
      if (resource.resourceType === "service") {
        this.serviceFunctionCheck(resourceData);
        // @ts-ignore
        resultData = await this.serviceManager.getServiceMap()[resourceData.service][resourceData.serviceFunction](ctx);
      } else if (resource.resourceType === "sql") {
        if (ctx.app.database) {
          resultData = await sqlResource({
            jianghuKnex: ctx.app.jianghuKnex,
            appData: body.appData,
            resourceData,
          });
        }
      }

      if (afterHooks) {
        for (const afterHook of afterHooks) {
          if (afterHook.service === "webview") {
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await this.webviewManager[afterHook.serviceFunction](ctx);
          } else {
            this.serviceFunctionCheck(afterHook);
            // @ts-ignore
            await this.serviceManager.getServiceMap()[afterHook.service][afterHook.serviceFunction](ctx);
          }
        }
      }
      // @ts-ignore
      if (resource.resourceType === "service" || (resource.resourceType === "sql" && !["select", "jhSelect"].includes(resource.resourceData.operation))) {
        if (database) {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          await this.serviceManager.getServiceMap().common.savePlanToFile(ctx.app.jianghuKnex, database);
        }
      }
    } else {
      Logger.showError(`无效的 resource 请求, pageId: ${pageId as string}, actionId: ${actionId as string}`);
      // todo error enum
      resultData = {
        error: "无效请求",
      };
    }

    // 回消息
    const panel = this.webviewManager.getPanel(pageId as string);
    if (panel) {
      const returnBody = { ...body };
      returnBody.packageType = "messageResponse";
      returnBody.appData = { resultData };
      await panel.webview.postMessage(returnBody);
    }
  }

  private serviceFunctionCheck(resourceData: any): void {
    if (
      !this.serviceManager.getServiceMap() ||
      !resourceData ||
      !this.serviceManager.getServiceMap()[resourceData.service] ||
      !this.serviceManager.getServiceMap()[resourceData.service][resourceData.serviceFunction]
    ) {
      Logger.error(`${resourceData.service as string} : ${resourceData.serviceFunction as string}`);
      throw new BizError(ErrorInfo.resource_not_found);
    }
  }
}
