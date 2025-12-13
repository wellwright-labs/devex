/**
 * Version info loaded from deno.json
 */

import denoConfig from "../../deno.json" with { type: "json" };

export const VERSION = denoConfig.version;
export const NAME = denoConfig.name;
