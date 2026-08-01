export default {
  async fetch(request, env, ctx) {

    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    };

    if (request.method === "OPTIONS") {
      return new Response("", {
        headers: cors
      });
    }

    // Dashboard
    if (path === "/") {
      return env.ASSETS.fetch(request);
    }

    // ========= API =========

    if (path === "/api/list") {
      return listLinks(env, cors);
    }

    if (path === "/api/create") {
      return createLink(request, env, cors);
    }

    if (path === "/api/update") {
      return updateLink(request, env, cors);
    }

    if (path === "/api/delete") {
      return deleteLink(request, env, cors);
    }

    if (path === "/api/fetch-og") {
      return fetchOG(request, cors);
    }

    // ========= Redirect =========

    const slug = path.substring(1);

    return redirectLink(slug, request, env);

  }
}
async function listLinks(env, cors) {

  const { results } = await env.DB.prepare(
    `SELECT *
     FROM links
     ORDER BY id DESC`
  ).all();

  return Response.json(results, {
    headers: cors
  });

}

async function createLink(request, env, cors) {

  const body = await request.json();

  const slug = body.slug;
  const url = body.url;
  const title = body.title || "";
  const image = body.image || "";
  const description = body.description || "";

  await env.DB.prepare(`
      INSERT INTO links
      (slug, original_url, title, image, description)
      VALUES (?, ?, ?, ?, ?)
  `)
  .bind(
      slug,
      url,
      title,
      image,
      description
  )
  .run();

  return Response.json({
      success: true
  }, {
      headers: cors
  });

}

async function updateLink(request, env, cors) {

  const body = await request.json();

  await env.DB.prepare(`
      UPDATE links
      SET
          original_url=?,
          title=?,
          image=?,
          description=?
      WHERE slug=?
  `)
  .bind(
      body.url,
      body.title,
      body.image,
      body.description,
      body.slug
  )
  .run();

  return Response.json({
      success: true
  }, {
      headers: cors
  });

}

async function deleteLink(request, env, cors) {

  const body = await request.json();

  await env.DB.prepare(`
      DELETE FROM links
      WHERE slug=?
  `)
  .bind(body.slug)
  .run();

  return Response.json({
      success: true
  }, {
      headers: cors
  });

}
async function fetchOG(request, cors) {

  const { url } = await request.json();

  if (!url) {
    return Response.json(
      { success: false, error: "Missing URL" },
      { headers: cors, status: 400 }
    );
  }

  try {

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await res.text();

    const find = (property) => {
      const re = new RegExp(
        <meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'],
        "i"
      );
      return html.match(re)?.[1] || "";
    };

    const title =
      find("og:title") ||
      html.match(/<title>(.*?)<\/title>/i)?.[1] ||
      "";

    const description = find("og:description");
    const image = find("og:image");

    return Response.json(
      {
        success: true,
        title,
        description,
        image
      },
      { headers: cors }
    );

  } catch {

    return Response.json(
      {
        success: false,
        error: "Unable to fetch OG data"
      },
      { headers: cors, status: 500 }
    );
  }
}

async function redirectLink(slug, request, env) {

  const { results } = await env.DB.prepare(`
      SELECT slug,
             original_url,
             title,
             image,
             description
      FROM links
      WHERE slug=?
      LIMIT 1
  `).bind(slug).all();

  if (!results.length) {
    return new Response("404 Not Found", { status: 404 });
  }

  const link = results[0];

  const ua = (request.headers.get("User-Agent") || "").toLowerCase();

  const bots = [
    "twitterbot",
    "facebookexternalhit",
    "telegrambot",
    "discordbot",
    "linkedinbot",
    "slackbot",
    "whatsapp"
  ];

  const isBot = bots.some(bot => ua.includes(bot));

  if (isBot) {

    return new Response(`<!doctype html>
<html>
<head>

<meta charset="utf-8">

<title>${link.title || "Watch Video"}</title>

<meta property="og:type" content="website">
<meta property="og:title" content="${link.title || "Watch Video"}">
<meta property="og:description" content="${link.description || "Tap to play"}">
<meta property="og:image" content="${link.image || ""}">
<meta property="og:url" content="${request.url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${link.title || "Watch Video"}">
<meta name="twitter:description" content="${link.description || "Tap to play"}">
<meta name="twitter:image" content="${link.image || ""}">

</head>
<body></body>
</html>`, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      }
    });
  }

  return Response.redirect(link.original_url, 302);
}
