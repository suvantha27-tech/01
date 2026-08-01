const { results } = await env.DB.prepare(
  "SELECT * FROM links WHERE slug=? LIMIT 1"
).bind(slug).all();

if (results.length) {

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

    const title = link.title || "Watch Video";

    const description = "Tap to play";

    const image = link.image || "https://img.lightshot.app/If9jBYpOS6exLGJTgUQLdw.png";

    return new Response(`<!DOCTYPE html>
<html>
<head>

<meta charset="utf-8">

<title>${title}</title>

<meta property="og:type" content="video.other">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${request.url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">

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
