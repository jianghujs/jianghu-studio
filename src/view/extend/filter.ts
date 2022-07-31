"use strict";

const filters: { [key: string]: (...args: any[]) => any } = {
  shorten(str: string, count: number): string {
    return str.slice(0, count || 5);
  },
};

// 一些 njk 的 filter
export default filters;
