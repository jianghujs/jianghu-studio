import { TableEnum } from "../common/constants";

export default [
  {
    pageId: "index",
    actionId: "callTest",
    desc: "测试",
    resourceHook: {},
    resourceType: "service",
    appDataSchema: {},
    resourceData: {
      service: "test",
      serviceFunction: "testResource",
    },
  },
  {
    pageId: "pagePlanEdit",
    actionId: "getResourceList",
    desc: "测试",
    resourceHook: {},
    resourceType: "sql",
    appDataSchema: {},
    resourceData: { table: TableEnum._resource, operation: "select" },
  },
  {
    pageId: "pagePlanEdit",
    actionId: "getUiList",
    desc: "测试",
    resourceHook: {},
    resourceType: "sql",
    appDataSchema: {},
    resourceData: { table: TableEnum._ui, operation: "select" },
  },
  {
    pageId: "pagePlanEdit",
    actionId: "getTestCaseList",
    desc: "测试",
    resourceHook: {
      before: [{ service: "testCase", serviceFunction: "alertTable" }],
    },
    resourceType: "sql",
    appDataSchema: {},
    resourceData: { table: TableEnum._test_case, operation: "select" },
  },
  {
    pageId: "pagePlanEdit",
    actionId: "updateResourceList",
    desc: "根据resource 数组crud数据",
    resourceHook: {},
    resourceType: "service",
    appDataSchema: {},
    resourceData: { service: "resource", serviceFunction: "updateByList" },
  },
  {
    pageId: "pagePlanEdit",
    actionId: "updateUiList",
    desc: "根据ui 数组crud数据",
    resourceHook: {},
    resourceType: "service",
    appDataSchema: {},
    resourceData: { service: "ui", serviceFunction: "updateByList" },
  },
  {
    pageId: "pagePlanEdit",
    actionId: "updateTestCaseList",
    desc: "根据testId 数组crud数据",
    resourceHook: {},
    resourceType: "service",
    appDataSchema: {},
    resourceData: { service: "testCase", serviceFunction: "updateByList" },
  },
  {
    pageId: "pageEdit",
    actionId: "selectItem",
    desc: "查询",
    resourceHook: {},
    resourceType: "sql",
    appDataSchema: {},
    resourceData: { table: TableEnum._page, operation: "select" },
  },
  {
    pageId: "pageEdit",
    actionId: "updateItem",
    desc: "修改",
    resourceHook: {
      after: [{ service: "common", serviceFunction: "refreshDbList" }],
    },
    resourceType: "sql",
    appDataSchema: {},
    resourceData: { table: TableEnum._page, operation: "update" },
  },
  {
    pageId: "pageEdit",
    actionId: "insertItem",
    desc: "新增",
    resourceHook: {
      after: [{ service: "common", serviceFunction: "refreshDbList" }],
    },
    resourceType: "sql",
    appDataSchema: {},
    resourceData: { table: TableEnum._page, operation: "insert" },
  },
  {
    pageId: "pageEdit",
    actionId: "deleteItem",
    desc: "删除",
    resourceHook: {
      after: [
        { service: "common", serviceFunction: "refreshDbList" },
        { service: "webview", serviceFunction: "del" },
      ],
    },
    resourceType: "sql",
    appDataSchema: {},
    resourceData: { table: TableEnum._page, operation: "delete" },
  },
  {
    pageId: "templateAdd",
    actionId: "runInstall",
    desc: "运行命令、一键安装",
    resourceHook: {},
    resourceType: "service",
    appDataSchema: {},
    resourceData: { service: "common", serviceFunction: "runInstall" },
  },
  {
    pageId: "userManagement",
    actionId: "resetUserPassword",
    desc: "✅用户管理-修改密码",
    resourceHook: "",
    resourceType: "service",
    appDataSchema: "",
    resourceData: { service: "userManagement", serviceFunction: "resetUserPassword" },
  },
  {
    pageId: "userManagement",
    actionId: "updateItem",
    desc: "✅用户管理-更新用户",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user", operation: "jhUpdate" },
  },
  {
    pageId: "recordHistoryManagement",
    actionId: "selectOnUseItemListByTable",
    desc: "✅获取指定表的使用中的数据列表",
    resourceHook: "",
    resourceType: "service",
    appDataSchema: "",
    resourceData: { service: "recordHistory", serviceFunction: "selectOnUseItemListByTable" },
  },
  {
    pageId: "recordHistoryManagement",
    actionId: "selectDeletedItemListByTable",
    desc: "✅获取指定表的已删除的数据列表",
    resourceHook: "",
    resourceType: "service",
    appDataSchema: "",
    resourceData: { service: "recordHistory", serviceFunction: "selectDeletedItemListByTable" },
  },
  {
    pageId: "recordHistoryManagement",
    actionId: "selectItemList",
    desc: "✅获取数据历史表",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_record_history", operation: "select" },
  },
  {
    pageId: "recordHistoryManagement",
    actionId: "restoreRecordByRecordHistory",
    desc: "✅还原数据",
    resourceHook: "",
    resourceType: "service",
    appDataSchema: "",
    resourceData: { service: "recordHistory", serviceFunction: "restoreRecordByRecordHistory" },
  },
  {
    pageId: "userManagement",
    actionId: "selectItemList",
    desc: "✅用户管理-查询信息",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user", operation: "select" },
  },
  {
    pageId: "userManagement",
    actionId: "insertItem",
    desc: "✅用户管理-查询信息",
    resourceHook: "",
    resourceType: "service",
    appDataSchema: "",
    resourceData: { service: "userManagement", serviceFunction: "addUser" },
  },
  {
    pageId: "userManagement",
    actionId: "resetUserPassword",
    desc: "✅用户管理-修改密码",
    resourceHook: "",
    resourceType: "service",
    appDataSchema: "",
    resourceData: { service: "userManagement", serviceFunction: "resetUserPassword" },
  },
  {
    pageId: "userManagement",
    actionId: "updateItem",
    desc: "✅用户管理-更新用户",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user", operation: "jhUpdate" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "selectItemList",
    desc: "✅权限管理页-查询已配置权限列表",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user_group_role", operation: "select" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "selectUser",
    desc: "✅权限管理页-查询用户",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user", operation: "select" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "selectGroup",
    desc: "✅权限管理页-查询群组",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_group", operation: "select" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "insertItem",
    desc: "✅权限管理页-创建权限配置",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user_group_role", operation: "jhInsert", whereCondition: "" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "updateItem",
    desc: "✅权限管理页-更新权限配置",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user_group_role", operation: "jhUpdate", whereParamsCondition: ".where(function() {this.where(whereParams)})" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "deleteItem",
    desc: "✅权限管理页-删除权限配置",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user_group_role", operation: "jhDelete", whereParamsCondition: ".where(function() {this.where(whereParams)})" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "selectRole",
    desc: "✅权限管理页-查询角色",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_role", operation: "select" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "insertUser",
    desc: "✅权限管理页-添加用户",
    resourceHook: "",
    resourceType: "service",
    appDataSchema: "",
    resourceData: { service: "userManagement", serviceFunction: "addUser" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "insertGroup",
    desc: "✅权限管理页-添加群组",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_group", operation: "jhInsert" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "insertRole",
    desc: "✅权限管理页-添加角色",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_role", operation: "jhInsert" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "deleteUser",
    desc: "✅权限管理页-删除用户",
    resourceHook: { before: [], after: [{ service: "userGroupRoleManagement", serviceFunction: "deleteUserGroupRole" }] },
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user", operation: "jhDelete" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "deleteGroup",
    desc: "✅权限管理页-删除群组",
    resourceHook: { before: [], after: [{ service: "userGroupRoleManagement", serviceFunction: "deleteUserGroupRole" }] },
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_group", operation: "jhDelete" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "deleteRole",
    desc: "✅权限管理页-删除角色",
    resourceHook: { before: [], after: [{ service: "userGroupRoleManagement", serviceFunction: "deleteUserGroupRole" }] },
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_role", operation: "jhDelete" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "updateUser",
    desc: "✅权限管理页-更新用户",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_user", operation: "jhUpdate" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "updateGroup",
    desc: "✅权限管理页-更新群组",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_group", operation: "jhUpdate" },
  },
  {
    pageId: "userGroupRoleManagement",
    actionId: "updateRole",
    desc: "✅权限管理页-更新角色",
    resourceHook: "",
    resourceType: "sql",
    appDataSchema: "",
    resourceData: { table: "_role", operation: "jhUpdate" },
  },
];
