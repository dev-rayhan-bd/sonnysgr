import { Router, Request, Response } from 'express';
import path from 'path';

const docsRouter = Router();

// Endpoint to deliver the raw OpenAPI JSON specification
docsRouter.get('/openapi.json', (req: Request, res: Response) => {
  const specPath = path.join(__dirname, 'openapi.json');
  res.sendFile(specPath);
});

// Endpoint to deliver the interactive Redocly 3-panel documentation UI
docsRouter.get('/', (req: Request, res: Response) => {
  const redocHTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>Sneaker Hub — API Documentation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="https://cdn-icons-png.flaticon.com/512/2589/2589903.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #ffffff;
      }
      /* Custom styling enhancements for Redoc */
      .redoc-wrap {
        font-family: 'Inter', sans-serif !important;
      }
    </style>
  </head>
  <body>
    <redoc spec-url="/api/v1/docs/openapi.json"
      options='{
        "theme": {
          "colors": {
            "primary": {
              "main": "#111827"
            },
            "success": {
              "main": "#10B981"
            },
            "warning": {
              "main": "#F59E0B"
            },
            "error": {
              "main": "#EF4444"
            },
            "gray": {
              "50": "#F9FAFB",
              "100": "#F3F4F6"
            }
          },
          "typography": {
            "fontFamily": "Inter, sans-serif",
            "headings": {
              "fontFamily": "Inter, sans-serif",
              "fontWeight": "700"
            },
            "code": {
              "fontFamily": "Fira Code, monospace"
            }
          },
          "sidebar": {
            "backgroundColor": "#FAFAFA",
            "textColor": "#1F2937",
            "activeTextColor": "#111827"
          },
          "rightPanel": {
            "backgroundColor": "#0F172A",
            "textColor": "#E2E8F0"
          }
        },
        "expandResponses": "200,201",
        "requiredPropsFirst": true,
        "sortPropsAlphabetically": false,
        "showExtensions": true,
        "nativeScrollbars": true,
        "hideDownloadButton": false,
        "pathInMiddlePanel": true
      }'>
    </redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(redocHTML);
});

export default docsRouter;
