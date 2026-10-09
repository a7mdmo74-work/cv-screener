export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errorCode?: import("@/i18n/errors").ErrorCode; errorParams?: Record<string, string | number> };
