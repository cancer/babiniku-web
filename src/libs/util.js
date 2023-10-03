// @ts-check

export const timer = () => {
  let lastUpdated = Date.now();
  return {
    getDelta() {
      return Date.now() - lastUpdated;
    },
    lap() {
      lastUpdated = Date.now();
    },
  };
};

/**
 * 2点間の線形補間を求める
 *
 * @param {number} a
 * @param {number} b
 * @param {number} fraction
 */
export const getLerp = (a, b, fraction) => (b - a) * fraction + a;
