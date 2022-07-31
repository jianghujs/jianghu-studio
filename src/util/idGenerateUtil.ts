import * as _ from "lodash";

/**
 * Tip:
 *   - 前端使用: const nanoid=(t=21)=>{let e="",r=crypto.getRandomValues(new Uint8Array(t));for(;t--;){let n=63&r[t];e+=n<36?n.toString(36):n<62?(n-26).toString(36).toUpperCase():n<63?"_":"-"}return e};
 * @param {*} n
 * @returns
 */
export class IdGenerateUtil {
  public static timestamp_6number() {
    return `${Date.now()}_${_.random(100000, 999999)}`;
  }
  public static randomString(length: number) {
    const charList = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
    const charListLength = charList.length;
    let str = "";
    for (let i = 0; i < length; i++) {
      str += charList.charAt(Math.floor(Math.random() * charListLength));
    }
    return str;
  }
}
