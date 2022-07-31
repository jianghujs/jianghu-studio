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
}
