import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "테스트 응답입니다." });
});

app.get("/trending", async (c) => {
  // TODO: velog trending 크롤링/API 연동
  return c.json({ trending: [] });
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
