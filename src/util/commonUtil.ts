import * as vscode from "vscode";
import { Confirm } from "../common/constants";

export class CommonUtil {
  public static confirm(placeHolder: string, callback: () => void) {
    void vscode.window.showQuickPick([Confirm.YES, Confirm.NO], { placeHolder }).then(res => {
      if (res === Confirm.YES) {
        callback();
      }
    });
  }
  public static getUiConfigFunctionArr(arr: any[] | null = null) {
    if (arr) {
      const functionArr = arr.map((e: { function: any }) => e.function);
      return JSON.stringify(functionArr);
    }
    return "";
  }

  public static handleValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return value.toString();
    }
    if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      return value.map(CommonUtil.handleValue);
    }
    if (typeof value === "object") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Object.keys(value).forEach(key => {
        value[key] = CommonUtil.handleValue(value[key]);
      });
    }
    return value;
  }
}
