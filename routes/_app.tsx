import { define } from "@/utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <title>Fresh Quiz</title>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
