/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as vscode from "vscode";

// 日志工具
export default class Logger {
  /**
   * todo 全局日志开关，发布时可以注释掉日志输出
   */
  public static info(...args: any[]) {
    console.log(...args);
  }
  public static warn(...args: any[]) {
    console.warn(...args);
  }
  public static error(...args: any[]) {
    console.error(...args);
  }

  /**
   * 弹出错误信息
   */
  public static showError(info: string) {
    void vscode.window.showErrorMessage(info);
  }

  /**
   * 弹出提示信息
   */
  public static showInfo(info: string) {
    void vscode.window.showInformationMessage(info);
  }
}
