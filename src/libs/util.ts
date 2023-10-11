export type Timer = {
  getDelta(): number;
  lap(): void;
};
export const timer = (): Timer => {
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
 */
export const getLerp = (a: number, b: number, fraction: number) =>
  (b - a) * fraction + a;
