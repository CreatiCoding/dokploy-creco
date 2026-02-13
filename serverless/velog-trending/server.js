import { serve } from "@hono/node-server";
import { Hono } from "hono";

const VALID_TIMEFRAMES = ["day", "week", "month"];

async function fetchTrendingPosts(timeframe) {
  const res = await fetch(`https://velog.io/trending/${timeframe}`, {
    headers: { RSC: "1" },
  });

  if (!res.ok) {
    throw new Error(`velog responded with ${res.status}`);
  }

  const text = await res.text();

  // RSC payload: each line is "KEY:JSON_VALUE". Find the line containing post data.
  for (const line of text.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const value = line.slice(colonIdx + 1);
    if (!value.includes('"data":[')) continue;

    try {
      // Format: ["$","$L...",null,{"data":[...posts...]}]
      const parsed = JSON.parse(value);
      const data = parsed?.[3]?.data;
      if (Array.isArray(data)) return data;
    } catch {
      // not the right line, continue
    }
  }

  throw new Error("Failed to parse trending data from velog");
}

function toResponseItem(post) {
  return {
    title: post.title,
    description: post.short_description,
    thumbnail: post.thumbnail,
    url: `https://velog.io/@${post.user.username}/${post.url_slug}`,
    author: {
      username: post.user.username,
      displayName: post.user.profile?.display_name ?? post.user.username,
      thumbnail: post.user.profile?.thumbnail ?? null,
    },
    likes: post.likes,
    commentsCount: post.comments_count,
    releasedAt: post.released_at,
  };
}

const app = new Hono();

app.get("/:timeframe", async (c) => {
  const timeframe = c.req.param("timeframe");

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return c.json(
      { error: `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(", ")}` },
      400,
    );
  }

  try {
    const posts = await fetchTrendingPosts(timeframe);
    const items = posts.map(toResponseItem);

    return c.json({
      timeframe,
      count: items.length,
      items,
    });
  } catch (err) {
    return c.json({ error: err.message }, 502);
  }
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
