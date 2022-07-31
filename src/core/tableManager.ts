// 处理 resource 相关

import resourceList from "../table/_resource";
import uiActionList from "../table/_ui";

export default class TableManager {
  private handlerMap: {
    [key: string]: any;
  };

  constructor() {
    this.handlerMap = {};
  }

  public findResource(pageId: string, actionId: string) {
    const resource = resourceList.find(res => res.pageId === pageId && res.actionId === actionId);
    return resource;
  }

  public getUiActionList(pageId: string) {
    return uiActionList.filter(res => res.pageId === pageId);
  }
}
