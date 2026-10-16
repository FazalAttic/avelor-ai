import { InvalidTenantIdError, type TenantId, parseTenantId } from "@avelor/core";
import { createMiddleware } from "hono/factory";

export type TenantVariables = {
  tenantId: TenantId;
};

export const requireTenant = createMiddleware<{ Variables: TenantVariables }>(async (c, next) => {
  const rawTenant = c.req.header("x-tenant-id");

  if (!rawTenant) {
    return c.json(
      {
        error: {
          code: "MISSING_TENANT_ID",
          message: "Header 'x-tenant-id' is required for this operation",
        },
      },
      400
    );
  }

  try {
    const tenantId = parseTenantId(rawTenant);
    c.set("tenantId", tenantId);
    await next();
  } catch (err) {
    const message = err instanceof InvalidTenantIdError ? err.message : "Invalid Tenant ID";
    return c.json(
      {
        error: {
          code: "INVALID_TENANT_ID",
          message,
        },
      },
      400
    );
  }
});
