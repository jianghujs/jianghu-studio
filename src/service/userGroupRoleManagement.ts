/* eslint-disable @typescript-eslint/no-unsafe-call */
import { TableEnum } from "../common/constants";
import BaseService from "./base";

export default class UserGroupRoleManagementService extends BaseService {
  public async deleteUserGroupRole(ctx: any): Promise<void> {
    const { jianghuKnex } = ctx.app;
    const { where } = ctx.request.body.appData;
    await jianghuKnex(TableEnum._user_group_role).where(where).jhDelete();
  }
}
