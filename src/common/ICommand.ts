import * as vscode from "vscode";

export class ICommand implements vscode.Command {
  public title!: string;
  public command!: string;
  public tooltip?: string | undefined;
  public arguments?: any[] | undefined;
  constructor(title: string, command: string, tooltip?: string | undefined, args?: any[] | undefined) {
    this.title = title;
    this.command = command;
    this.tooltip = tooltip;
    this.arguments = args;
  }
}
