import { describe, expect, test } from "bun:test";
import {
  requireAwardKey,
  requireComplianceKey,
  requireCron,
  requireOperator,
  safeEqual,
} from "./auth";
import { ApiError } from "./errors";

process.env.OPERATOR_UI_TOKEN = "op-token-32bytes-long-value-ok";
process.env.AWARD_API_KEY = "award-key-32bytes-long-value-ok";
process.env.COMPLIANCE_API_KEY = "comp-key-32bytes-long-value-ok";

function req(headers: Record<string, string>): Request {
  return new Request("http://local/api", { headers });
}

describe("auth", () => {
  test("constant-time equal accepts matching tokens", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });

  test("operator / TEE headers 401 on missing or wrong token", () => {
    expect(() => requireOperator(req({}))).toThrow(ApiError);
    expect(() => requireOperator(req({ authorization: "Bearer nope" }))).toThrow(
      ApiError,
    );
    expect(() => requireAwardKey(req({}))).toThrow(ApiError);
    expect(() =>
      requireComplianceKey(req({ "x-compliance-api-key": "nope" })),
    ).toThrow(ApiError);

    requireOperator(req({ authorization: "Bearer op-token-32bytes-long-value-ok" }));
    requireAwardKey(req({ "x-award-api-key": "award-key-32bytes-long-value-ok" }));
    requireComplianceKey(
      req({ "x-compliance-api-key": "comp-key-32bytes-long-value-ok" }),
    );
  });

  test("requireCron uses OPERATOR_UI_TOKEN when CRON_SECRET is unset", () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    expect(() => requireCron(req({}))).toThrow(ApiError);
    requireCron(req({ authorization: "Bearer op-token-32bytes-long-value-ok" }));
    if (previous !== undefined) process.env.CRON_SECRET = previous;
  });

  test("requireCron uses CRON_SECRET when set", () => {
    process.env.CRON_SECRET = "cron-secret-32bytes-long-value-ok";
    expect(() =>
      requireCron(req({ authorization: "Bearer op-token-32bytes-long-value-ok" })),
    ).toThrow(ApiError);
    requireCron(req({ authorization: "Bearer cron-secret-32bytes-long-value-ok" }));
    delete process.env.CRON_SECRET;
  });
});
