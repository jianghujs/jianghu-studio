/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BizError, ErrorInfo } from "../common/constants";
import _ = require("lodash");

function jianghuEval({ evalString }: any) {
  let result = evalString;
  try {
    result = eval(evalString as string);
  } catch (error) {
    // 什么都不用做, 返回 result
  }
  return result;
}

function validate({ appData, resourceData }: any) {
  const { operation = "" }: { operation: string } = resourceData;
  console.log("resourceData", resourceData);
  const { actionData = {} } = appData;

  if (!["select", "insert", "update", "delete", "jhInsert", "jhUpdate", "jhDelete"].includes(operation)) {
    throw new BizError(ErrorInfo.resource_sql_operation_invalid);
  }

  // 创建 or 更新时不能指定 主键id ===> 避免无操作
  delete actionData.id;
}

/**
 * 从 appData 构建 Where 语句
 *
 * @param appData
 * @param appData.where
 * @param appData.whereLike
 * @param appData.whereIn
 * @param appData.whereOptions
 * @param appData.whereOrOptions
 * @param appData.limit
 * @param appData.offset
 * @param appData.orderBy
 * @param appData.whereKnex
 */
function buildWhereConditionFromAppData({ where = {}, whereLike = {}, whereIn = {}, whereOptions = [], whereOrOptions = [], whereKnex = "", limit, offset, orderBy = [] }: any) {
  // where
  let wherePart = "";
  if (!_.isEmpty(where)) {
    wherePart = `.where(${JSON.stringify(where)})`;
  }

  // whereLike
  let whereLikePart = "";
  if (!_.isEmpty(whereLike)) {
    for (const key in whereLike) {
      const value = whereLike[key] || "";
      whereLikePart = whereLikePart + `.where('${key}', 'like', '%${value as string}%')`;
    }
  }

  // whereIn
  let whereInPart = "";
  if (!_.isEmpty(whereIn)) {
    Object.entries(whereIn as object).forEach(([key, value]) => {
      whereInPart += `.whereIn('${key}', ${JSON.stringify(value)})`;
    });
  }

  // whereOptions： [['name', '=', 'zhangshan'],['level', '>', 3],['a', 100]]
  let whereOptionsPart = "";
  if (!_.isEmpty(whereOptions)) {
    whereOptions.forEach((whereOption: any[]) => {
      if (whereOption.length === 3) {
        whereOptionsPart += `.where('${whereOption[0]}', '${whereOption[1]}', '${whereOption[2]}')`;
      } else if (whereOption.length === 2) {
        whereOptionsPart += `.where('${whereOption[0]}', '${whereOption[1]}')`;
      } else {
        throw new BizError(ErrorInfo.resource_sql_where_options_invalid);
      }
    });
  }

  // whereOrOptions，相当于 and ( statement1 or statement2 )
  //  [['name', '=', 'zhangshan'],['level', '>', 3],['a', 100]]
  let whereOrOptionsPart = "";
  if (!_.isEmpty(whereOrOptions)) {
    whereOrOptionsPart += ".where(function() { this";
    whereOrOptions.forEach((whereOrOption: any[]) => {
      if (whereOrOption.length === 3) {
        whereOrOptionsPart += `.orWhere('${whereOrOption[0]}', '${whereOrOption[1]}', '${whereOrOption[2]}')`;
      } else if (whereOrOption.length === 2) {
        whereOrOptionsPart += `.orWhere('${whereOrOption[0]}', '${whereOrOption[1]}')`;
      } else {
        throw new BizError(ErrorInfo.resource_sql_where_options_invalid);
      }
    });
    whereOrOptionsPart += "})";
  }

  // limit offset
  let limitAndOffset = "";
  if (limit) {
    limitAndOffset += `.limit(${limit})`;
  }
  if (offset) {
    limitAndOffset += `.offset(${offset})`;
  }

  // orderBy：.orderBy([{ column: 'email' }, { column: 'age', order: 'desc' }])
  let orderByPart = "";
  if (!_.isEmpty(orderBy)) {
    orderByPart = `.orderBy(${JSON.stringify(orderBy)})`;
  }

  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  return wherePart + whereLikePart + whereInPart + whereOptionsPart + whereOrOptionsPart + whereKnex + orderByPart + limitAndOffset;
}

/**
 * 从 resourceData 构建 Where 语句
 * (ctx, userInfo 参数用于数据 eval 环境)
 * @param resourceData
 * @param ctx
 * @param userInfo
 */
// eslint-disable-next-line no-unused-vars
function buildWhereConditionFromResourceData(resourceData: { [x: string]: any }) {
  if (!resourceData) {
    return "";
  }

  const backendAppData: any = {};
  // 如：{ "where": { "field1": "ctx.someData" } }
  ["where", "whereLike", "whereIn"].forEach(appDataKey => {
    const expressionObject = resourceData[appDataKey];
    if (!expressionObject) {
      return;
    }
    const valueObject: { [key: string | number]: any } = {};
    _.forEach(expressionObject, (value: any, key: string | number) => {
      valueObject[key] = jianghuEval({ evalString: value });
    });
    backendAppData[appDataKey] = valueObject;
  });

  // 如：{ "whereOptions": "ctx.someList" }
  ["whereOptions", "whereOrOptions"].forEach(appDataKey => {
    const expressionObject = resourceData[appDataKey];
    if (!expressionObject) {
      return;
    }
    const valueObject: any[] = [];
    _.forEach(expressionObject, (value: any) => {
      const evalString = value[value.length - 1];
      value[value.length - 1] = jianghuEval({ evalString });
      valueObject.push(value);
    });
    backendAppData[appDataKey] = valueObject;
  });

  return buildWhereConditionFromAppData(backendAppData);
}

async function runKnexFunction(knexFunctionString: string, args = {}) {
  const AsyncFunction: ObjectConstructor = Object.getPrototypeOf(async () => {
    // do samething
  }).constructor;
  const knexCommandCountFunc = new AsyncFunction(..._.keys(args), knexFunctionString);
  // @ts-ignore
  // eslint-disable-next-line no-return-await
  return await knexCommandCountFunc(..._.values(args));
}

/**
 * 构建 Where 语句
 * @param jianghuKnex
 * @param requestBody
 */
function buildWhereCondition({ appData, resourceData }: any) {
  // insert 不需要 where 语句
  if (resourceData.operation === "insert") {
    return "";
  }

  // 服务端部分，主要来自 resource 数据的 resourceData
  // 但如果配置了 dataAccessControl 数据，则以 dataAccessControl 的 resourceData 为准
  const backendResourceData: { [x: string]: any } = resourceData;
  backendResourceData.table = resourceData.table;
  backendResourceData.operation = resourceData.operation;
  const backendWhere = buildWhereConditionFromResourceData(backendResourceData);

  // 前端部分，来自前端传过来的 actionData，不支持 whereKnex
  delete appData.whereKnex;
  const frontendWhere = buildWhereConditionFromAppData(appData);

  return backendWhere + frontendWhere;
}
/**
 * 执行 sql resource
 *
 * actionData 数据参数
 * where jianghuKnex 查询条件
 * whereLike 模糊查询
 * whereOrOptions or查询
 * whereOptions jianghuKnex 原生的 where 三元查询
 * - [['name', '=', 'zhangshan'],['level', '>', 3]]
 * whereIn in查询
 * whereKnex 直接写 knex 语句，只在 resourceData 中有效
 * offset, limit 分页查询
 * - .limit(10).offset(30)
 * orderBy 排序
 * - .orderBy([{ column: 'email' }, { column: 'age', order: 'desc' }])
 * fields 要查询的字段，不传表示查询所有字段 (fields 字段暂时只能配在 resource 表中)
 * - ["id", ...]
 *
 * @param root0
 * @param root0.jianghuKnex
 * @param root0.ctx
 */
export async function sqlResource({ jianghuKnex, appData, resourceData }: any) {
  const actionData = appData.actionData || {};
  const { table, operation, fields }: { [key: string]: string } = resourceData;
  const { limit } = appData;

  // 校验并处理数据
  validate({ appData, resourceData });

  // 1. where 构建：前后端合并
  const whereCondition = buildWhereCondition({ appData, resourceData });

  // 2. 翻页场景需要 count 计算
  let count;
  if (limit) {
    let knexCommandCountString = `return await jianghuKnex('${table}')${whereCondition}.count('*', {as: 'count'});`;
    // 去掉 limit, offset, orderBy
    knexCommandCountString = knexCommandCountString
      .replace(/\.limit\([^)]+\)/, "")
      .replace(/\.offset\([^)]+\)/, "")
      .replace(/\.orderBy\([^)]+\)/, "");
    const result = await runKnexFunction(knexCommandCountString, { jianghuKnex, actionData });
    count = result[0].count;
  }

  // 3. jianghuKnex 执行
  let rows = null;
  await jianghuKnex.transaction(async (trx: any) => {
    let knexArgs = ["select", "delete", "jhDelete"].includes(operation) ? "" : "actionData";
    if (operation === "select" && !_.isEmpty(fields)) {
      knexArgs = "fields";
    }
    const knexCommandCountString = `return await trx('${table}')${whereCondition}.${operation}(${knexArgs});`;
    rows = await runKnexFunction(knexCommandCountString, { trx, actionData, fields });
  });

  return { rows, count };
}
