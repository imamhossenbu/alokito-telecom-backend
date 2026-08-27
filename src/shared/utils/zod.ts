import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

/**
 * Monkey-patches Zod's prototype with `.openapi()`. This mutates the
 * single shared 'zod' module instance, so it only needs to run once —
 * but every schema file that calls `.openapi(...)` must import `z` from
 * THIS file (not directly from 'zod') so that import execution order
 * guarantees the extension has already been applied before their
 * top-level `z.object({...}).openapi(...)` calls run.
 */
extendZodWithOpenApi(z);

export { z };
