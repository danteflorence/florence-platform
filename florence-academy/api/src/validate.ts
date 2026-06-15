// Tiny, dependency-free request-body validator. Each write route declares a
// schema; malformed bodies are rejected with precise per-field errors instead
// of silently coercing bad input. Not a full JSON-Schema engine — just the
// field checks the API actually needs (type, required, enum, range, length).

export interface FieldSpec {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  required?: boolean;
  enum?: readonly string[];
  /** number: min value · string: min length · array: min items */
  min?: number;
  /** number: max value · string: max length · array: max items */
  max?: number;
  /** element type for arrays */
  itemsType?: "string" | "number";
}

export type Schema = Record<string, FieldSpec>;
export interface FieldError {
  field: string;
  message: string;
}
export type ValidateResult = { ok: true } | { ok: false; errors: FieldError[] };

export function validate(body: unknown, schema: Schema): ValidateResult {
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const errors: FieldError[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });

  for (const [field, spec] of Object.entries(schema)) {
    const v = o[field];
    if (v === undefined || v === null) {
      if (spec.required) add(field, "is required");
      continue;
    }
    const typeOk =
      spec.type === "string"
        ? typeof v === "string"
        : spec.type === "boolean"
          ? typeof v === "boolean"
          : spec.type === "number"
            ? typeof v === "number" && Number.isFinite(v)
            : spec.type === "integer"
              ? typeof v === "number" && Number.isInteger(v)
              : spec.type === "array"
                ? Array.isArray(v)
                : spec.type === "object"
                  ? typeof v === "object" && !Array.isArray(v)
                  : false;
    if (!typeOk) {
      add(field, `must be a ${spec.type}`);
      continue;
    }
    if (spec.enum && !spec.enum.includes(v as string))
      add(field, `must be one of: ${spec.enum.join(", ")}`);
    if (typeof v === "number") {
      if (spec.min !== undefined && v < spec.min) add(field, `must be >= ${spec.min}`);
      if (spec.max !== undefined && v > spec.max) add(field, `must be <= ${spec.max}`);
    }
    if (typeof v === "string") {
      if (spec.min !== undefined && v.length < spec.min)
        add(field, `must be at least ${spec.min} character(s)`);
      if (spec.max !== undefined && v.length > spec.max)
        add(field, `must be at most ${spec.max} character(s)`);
    }
    if (Array.isArray(v)) {
      if (spec.max !== undefined && v.length > spec.max)
        add(field, `must have at most ${spec.max} item(s)`);
      if (spec.itemsType && !v.every((x) => typeof x === spec.itemsType))
        add(field, `items must be ${spec.itemsType}`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
