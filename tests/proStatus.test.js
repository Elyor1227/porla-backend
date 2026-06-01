const { computeProMeta, isProExpired } = require("../src/utils/proStatus");

describe("computeProMeta", () => {
  it("Pro bo'lmagan foydalanuvchi uchun bo'sh obyekt", () => {
    expect(computeProMeta({ isPro: false })).toEqual({});
    expect(computeProMeta(null)).toEqual({});
  });

  it("kelajakdagi muddat uchun qoldiq kunlarni hisoblaydi", () => {
    const future = new Date(Date.now() + 5 * 86400000);
    const meta = computeProMeta({ isPro: true, proExpiresAt: future });
    expect(meta.proExpired).toBe(false);
    expect(meta.proDaysLeft).toBeGreaterThanOrEqual(4);
    expect(meta.proDaysLeft).toBeLessThanOrEqual(5);
  });

  it("o'tgan muddat uchun proExpired=true", () => {
    const past = new Date(Date.now() - 86400000);
    const meta = computeProMeta({ isPro: true, proExpiresAt: past });
    expect(meta.proExpired).toBe(true);
    expect(meta.proDaysLeft).toBe(0);
  });
});

describe("isProExpired", () => {
  it("o'tgan muddat uchun true", () => {
    expect(isProExpired({ isPro: true, proExpiresAt: new Date(Date.now() - 1000) })).toBe(true);
  });
  it("kelajak muddat uchun false", () => {
    expect(isProExpired({ isPro: true, proExpiresAt: new Date(Date.now() + 1000) })).toBe(false);
  });
  it("Pro emas uchun false", () => {
    expect(isProExpired({ isPro: false })).toBe(false);
  });
});
