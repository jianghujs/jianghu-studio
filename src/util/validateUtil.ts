import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ErrorInfo, ValidateError } from "../common/constants";
const ajv = new Ajv();
addFormats(ajv);

export class validateUtil {
  public static validate(schema: any, data: any, checkColumnName = "数据") {
    const vali = ajv.compile(schema);
    const valid = vali(data);
    if (!valid) {
      // @ts-ignore
      const errorReasonSupplement = vali.errors.map(x => `${x.instancePath} ${x.message as string} ${JSON.stringify(x.params || {})}`).join("; ");
      // eslint-disable-next-line prefer-const
      let { errorCode, errorReason } = ErrorInfo.request_body_invalid;
      if (checkColumnName) {
        errorReason = `请求${checkColumnName}不符合规范`;
      }
      throw new ValidateError({ errorCode, errorReason, errorReasonSupplement });
    }
  }
}
