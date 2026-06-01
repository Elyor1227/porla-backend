const { signToken, signRefreshToken, verifyToken } = require("../src/utils/jwt");

describe("JWT utils", () => {
  const userId = "507f1f77bcf86cd799439011";

  it("access token type=access va jti bilan imzolanadi", () => {
    const token = signToken(userId);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(userId);
    expect(decoded.type).toBe("access");
    expect(decoded.jti).toBeDefined();
  });

  it("refresh token type=refresh bilan imzolanadi", () => {
    const token = signRefreshToken(userId);
    const decoded = verifyToken(token);
    expect(decoded.type).toBe("refresh");
  });

  it("har bir token noyob jti oladi", () => {
    const a = verifyToken(signToken(userId));
    const b = verifyToken(signToken(userId));
    expect(a.jti).not.toBe(b.jti);
  });

  it("noto'g'ri token verifyda xato beradi", () => {
    expect(() => verifyToken("invalid.token.here")).toThrow();
  });
});
