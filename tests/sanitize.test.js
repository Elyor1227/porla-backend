const { escapeRegex, safeSearchRegex } = require("../src/utils/sanitize");

describe("escapeRegex", () => {
  it("regex maxsus belgilarini ekranlaydi", () => {
    expect(escapeRegex("a.b*c")).toBe("a\\.b\\*c");
    expect(escapeRegex("(group)")).toBe("\\(group\\)");
    expect(escapeRegex("a+b?")).toBe("a\\+b\\?");
  });

  it("null/undefined uchun bo'sh satr qaytaradi", () => {
    expect(escapeRegex(null)).toBe("");
    expect(escapeRegex(undefined)).toBe("");
  });

  it("ekranlangan satr literal sifatida mos keladi (injection emas)", () => {
    const malicious = ".*";
    const re = new RegExp(escapeRegex(malicious));
    expect(re.test("anything")).toBe(false);
    expect(re.test(".*")).toBe(true);
  });
});

describe("safeSearchRegex", () => {
  it("uzunlikni cheklaydi va trim qiladi", () => {
    expect(safeSearchRegex("  hi  ")).toBe("hi");
    expect(safeSearchRegex("a".repeat(200), 10).length).toBe(10);
  });
});
