const AppError = require("../src/utils/AppError");

describe("AppError", () => {
  it("status, code va details ni saqlaydi", () => {
    const err = new AppError("xato", 418, "TEAPOT", { a: 1 });
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT");
    expect(err.details).toEqual({ a: 1 });
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it("factory metodlari to'g'ri status beradi", () => {
    expect(AppError.badRequest("x").statusCode).toBe(400);
    expect(AppError.unauthorized("x").statusCode).toBe(401);
    expect(AppError.forbidden("x").statusCode).toBe(403);
    expect(AppError.notFound("x").statusCode).toBe(404);
    expect(AppError.conflict("x").statusCode).toBe(409);
  });

  it("forbidden details (isPro) ni uzatadi", () => {
    const err = AppError.forbidden("locked", "COURSE_LOCKED", { isPro: true });
    expect(err.details.isPro).toBe(true);
  });
});
