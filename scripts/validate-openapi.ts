import SwaggerParser from "@apidevtools/swagger-parser";
import { parse } from "yaml";

const specPath = new URL("../docs/openapi.yaml", import.meta.url);
const specText = await Bun.file(specPath).text();
const spec = parse(specText);

await SwaggerParser.validate(spec);
console.info("OpenAPI spec is valid.");
