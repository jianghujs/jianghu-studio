export const ConstantsValue = {
  appMenus: [
    { label: "施工方案", value: "appPlan" },
    {
      label: "route管理",
      value: "routeManager",
      children: [
        { label: "系统route查看", value: "systemRoute" },
        { label: "自定义route管理", value: "customRoute" },
      ],
    },
    {
      label: "layout管理",
      value: "layoutManager",
      children: [
        { label: "js引入管理", value: "jsManager" },
        { label: "css引入管理", value: "cssManager" },
        { label: "font引入管理", value: "fontManager" },
        { label: "代码编辑", value: "codeEdit" },
      ],
    },
    {
      label: "页面管理",
      value: "pageManager",
      menus: [
        { label: "数据表管理", value: "pageDatabase" },
        { label: "页面布局管理", value: "pageDesign" },
        { label: "页面服务管理", value: "pageService" },
        { label: "页面权限配置", value: "pageAuthRole" },
        { label: "页面检查", value: "pageChack" },
      ],
    },
    {
      label: "UI组件管理",
      value: "componentManager",
      children: [
        { label: "系统组件查看", value: "systemComponent" },
        { label: "自定义组件管理", value: "customComponent" },
      ],
    },
    {
      label: "服务管理",
      value: "backendManager",
      children: [
        {
          label: "service管理",
          value: "serviceManager",
        },
        {
          label: "中间件配置",
          value: "middlewareManager",
          children: [
            { label: "框架级middleware查看", value: "sysMiddlewareManager" },
            { label: "自定义middleware管理", value: "customMiddlewareManager" },
          ],
        },
        { label: "controller管理", value: "controllerManager" },
        { label: "常量配置", value: "constantsManager" },
      ],
    },
    {
      label: "应用配置",
      value: "appSetting",
      children: [
        { label: "package管理", value: "packageManager" },
        { label: "config管理", value: "configManager" },
        {
          label: "配置数据表",
          value: "sysTableManager",
          children: [
            { label: "_page表", value: "pageTable" },
            { label: "_constants表", value: "constantsTable" },
            { label: "_resource表", value: "resourceTable" },
          ],
        },
        {
          label: "权限管理",
          value: "authRoleManager",
          children: [
            { label: "用户管理", value: "userManager" },
            { label: "用户群组角色", value: "userGroupRoleManager" },
            { label: "页面权限管理", value: "userGroupRolePageManager" },
            { label: "resource权限管理", value: "userGroupRoleResourceManager" },
          ],
        },
        { label: "登录信息", value: "userSessionManager" },
      ],
    },
  ],
};

export enum Confirm {
  YES = "YES",
  NO = "NO",
}
export enum Constants {
  CONFIG_PREFIX = "database-jianghu",
}
export enum CacheKey {
  // sql
  DATBASE_CONECTIONS = "mysql.connections",
}
export enum TableName {
  page = "_page",
  resource = "_resource",
  ui = "_ui",
}
export enum TableEnum {
  // ========================江湖表============================
  _cache = "_cache",
  _constant = "_constant",
  _app = "_app",
  _file = "_file",
  _group = "_group",
  _page = "_page",
  _ui = "_ui",
  _test_case = "_test_case",
  _resource = "_resource",
  _resource_request_log = "_resource_request_log",
  _record_history = "_record_history",
  _role = "_role",
  _user = "_user",
  _user_app = "_user_app",
  _view_user_app = "_view02_user_app",
  _user_group_role = "_user_group_role",
  _user_group_role_page = "_user_group_role_page",
  _user_group_role_resource = "_user_group_role_resource",
  _user_group_role_ui_level = "_user_group_role_ui_level",
  _user_session = "_user_session",
}

export class BizError extends Error {
  private errorCode: any;
  private errorReason: any;
  private errorReasonSupplement: any;
  constructor({ errorCode, errorReason, errorReasonSupplement }: any) {
    super(JSON.stringify({ errorCode, errorReason, errorReasonSupplement }));
    this.name = "BizError";
    this.errorCode = errorCode;
    this.errorReason = errorReason;
    this.errorReasonSupplement = errorReasonSupplement;
  }
}
export class ValidateError extends Error {
  private errorCode: any;
  private errorReason: any;
  private errorReasonSupplement: any;
  constructor({ errorCode, errorReason, errorReasonSupplement }: any) {
    super(JSON.stringify({ errorCode, errorReason, errorReasonSupplement }));
    this.name = "ValidateError";
    this.errorCode = errorCode;
    this.errorReason = errorReason;
    this.errorReasonSupplement = errorReasonSupplement;
  }
}

export const ErrorInfo = {
  // =============================request error: 请求错误===========================================
  data_exception: {
    errorCode: "data_exception",
    errorReason: "没有数据",
  },
  request_body_invalid: {
    errorCode: "request_body_invalid",
    errorReason: "请求body不符合规范",
  },
  request_data_invalid: {
    errorCode: "request_data_invalid",
    errorReason: "请求data不符合规范",
  },
  request_repeated: {
    errorCode: "request_repeated",
    errorReason: "重复的请求",
  },
  request_token_expired: {
    errorCode: "request_token_expired",
    errorReason: "token失效",
  },
  request_token_invalid: {
    errorCode: "request_token_invalid",
    errorReason: "无效token",
  },
  request_app_forbidden: {
    errorCode: "request_app_forbidden",
    errorReason: "你没有这个应用的访问权限",
  },
  request_group_forbidden: {
    errorCode: "request_group_forbidden",
    errorReason: "你不在当前群内",
  },

  // =============================server error: 服务器内部错误===========================================
  server_error: { errorCode: "server_error", errorReason: "服务器开小差了" },

  // =============================resource error: resource请求错误===========================================
  resource_sql_operation_invalid: {
    errorCode: "resource_sql_operation_invalid",
    errorReason: "无效的operation !",
  },
  resource_forbidden: {
    errorCode: "resource_forbidden",
    errorReason: "无执行权限",
  },
  resource_not_found: {
    errorCode: "resource_not_found",
    errorReason: "协议不存在",
  },
  resource_not_support: {
    errorCode: "resource_not_support",
    errorReason: "协议不支持",
  },
  resource_sql_missing_params: {
    errorCode: "resource_sql_missing_params",
    errorReason: "缺少必填参数",
  },
  resource_sql_where_options_invalid: {
    errorCode: "resource_sql_where_options_invalid",
    errorReason: "无效的 whereOptions 参数",
  },
  resource_sql_unique_check_fail: {
    errorCode: "resource_sql_unique_check_fail",
    errorReason: "数据已存在! 请勿重复操作。",
  },
  resource_service_not_found: {
    errorCode: "resource_service_not_found",
    errorReason: "接口不存在",
  },
  resource_service_method_not_found: {
    errorCode: "resource_service_method_not_found",
    errorReason: "接口(方法)不存在",
  },

  // =============================page error: 数据错误===========================================
  page_forbidden: { errorCode: "page_forbidden", errorReason: "无访问权限" },

  // =============================data error: 数据错误===========================================
  data_not_found: { errorCode: "data_not_found", errorReason: "数据不存在" },
  table_not_found: { errorCode: "table_not_found", errorReason: "数据表不存在" },

  // =============================user error: 用户错误===========================================
  user_not_exist: {
    errorCode: "request_user_not_exist",
    errorReason: "用户不存在",
  },
  user_id_exist: {
    errorCode: "user_exists",
    errorReason: "用户已存在",
  },
  user_password_error: {
    errorCode: "user_password_error",
    errorReason: "用户名 或 密码错误, 请重新输入!",
  },
  user_banned: {
    errorCode: "user_banned",
    errorReason: "账号被封禁! 请联系管理员。",
  },
  user_status_error: {
    errorCode: "user_status_error",
    errorReason: "用户状态异常! ",
  },
  user_password_reset_old_error: {
    errorCode: "user_password_reset_old_error",
    errorReason: "旧密码错误, 请重新输入!",
  },
  user_password_reset_same_error: {
    errorCode: "user_password_reset_same_error",
    errorReason: "新旧密码不能一样, 请重新输入!",
  },

  // =============================file: 文件错误===========================================
  file_directory: { errorCode: "file_directory", errorReason: "文件目录异常" },
  file_please_select_file: {
    errorCode: "file_please_upload_file",
    errorReason: "请选择文件",
  },
  file_damaged: {
    errorCode: "file_damaged",
    errorReason: "上传失败! 文件损坏!",
  },
  file_is_incomplete: {
    errorCode: "file_is_incomplete",
    errorReason: "文件不完整, 请重新上传!",
  },
  file_buffer_is_null: {
    errorCode: "file_buffer_is_null",
    errorReason: "文件是空的!",
  },
  file_base64_is_null: {
    errorCode: "file_base64_is_null",
    errorReason: "文件是空的!",
  },
  file_not_found: {
    errorCode: "file_not_found",
    errorReason: "文件不存在!",
  },
};
