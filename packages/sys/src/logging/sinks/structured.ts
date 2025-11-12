import type { LogRecord, LogSink } from "../types";

function serialize(rec: LogRecord): string {
  const meta = rec.meta ?? {};
  const { traceId = null, reqId = null, requestId = null, layer, ...rest } = meta as Record<string, unknown>;

  const payload: Record<string, unknown> = {
    ts: rec.time,
    level: rec.level,
    traceId: traceId ?? requestId ?? null,
    reqId: reqId ?? requestId ?? null,
    layer: typeof layer === "string" ? layer : rec.category ?? null,
    msg: rec.msg ?? "",
  };

  if (rec.err) {
    payload.err = {
      name: rec.err.name,
      message: rec.err.message,
      stack: rec.err.stack,
    };
  }

  if (Object.keys(rest).length > 0) {
    payload.fields = rest;
  }

  return JSON.stringify(payload);
}

export const structuredJsonSink: LogSink = {
  handle(rec: LogRecord) {
    const line = serialize(rec);
    if (rec.level === "error") {
      console.error(line);
      return;
    }
    if (rec.level === "warn") {
      console.warn(line);
      return;
    }
    if (rec.level === "info") {
      console.log(line);
      return;
    }
    console.debug(line);
  },
};

