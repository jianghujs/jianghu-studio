import * as fs from "fs";
import * as path from "path";
import BaseService from "../service/base";
import promisify from "../util/promiseUtil";
const readdirAsync = promisify(fs.readdir);

// 将 service 文件夹下的类实例化
export default class ServiceManager {
  private serviceMap: {
    [key: string]: [value: BaseService];
  };

  constructor() {
    this.serviceMap = {};
    // todo await
    void this.loadServices();
  }

  public getServiceMap() {
    return this.serviceMap;
  }

  private async loadServices() {
    const files = await readdirAsync(path.resolve(__dirname, "../service"));
    for (const file of files as [string]) {
      if (/^.*.js$/.test(file) && !file.startsWith("base")) {
        const module = await import(path.resolve(__dirname, "../service", file));
        if (module && "default" in module) {
          // todo ctx 完善
          const ctx = {};
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const service = new module.default(ctx);
          this.serviceMap[file.replace(".js", "")] = service;
        }
      }
    }
    console.log("[ServiceManager] 加载方法结束", Object.keys(this.serviceMap).length);
  }
}
