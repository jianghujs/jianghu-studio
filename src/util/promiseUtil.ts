/* eslint-disable @typescript-eslint/no-unsafe-call */
// Custom promisify
export default function promisify(fn: any) {
  /**
   * @param {...Any} params The params to pass into *fn*
   * @return {Promise<Any|Any[]>}
   */
  return function promisified(...params: [any]) {
    return new Promise((resolve, reject) => fn(...params.concat([(err: any, ...args: any) => (err ? reject(err) : resolve(args.length < 2 ? args[0] : args))])));
  };
}
