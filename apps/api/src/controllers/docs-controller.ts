import type { ControllerResult } from "./controller";

const OPENAPI_SPEC_URL = new URL("../../../../docs/openapi.yaml", import.meta.url);

export class DocsController {
  spec = async (): Promise<ControllerResult<string>> => ({
    body: "",
    response: new Response(await Bun.file(OPENAPI_SPEC_URL).text(), {
      status: 200,
      headers: {
        "content-type": "application/yaml; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
  });

  ui = (): ControllerResult<string> => ({
    body: "",
    response: new Response(renderDocsHtml(), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
  });

  redirect = (): ControllerResult<string> => ({
    body: "",
    response: new Response(null, {
      status: 302,
      headers: {
        location: "/docs",
        "cache-control": "no-store",
      },
    }),
  });
}

function renderDocsHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>eclick One API Docs</title>
    <style>
      body { margin: 0; background: #f4f1e8; }
    </style>
  </head>
  <body>
    <redoc spec-url="/api/v1/openapi.yaml"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
  </body>
</html>`;
}
