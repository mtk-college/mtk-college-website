// functions/api/callback.js
//
// Другі крок OAuth-уваходу. GitHub перанакіроўвае сюды з часовым "code".
// Мы абменьваем яго на сапраўдны access_token (патрабуецца сакрэт,
// які ведае толькі сервер — таму гэта робіцца тут, а не ў браўзеры),
// і перадаём токен назад у акно Decap CMS праз postMessage.
//
// Патрабуе пераменныя асяроддзя:
//   GITHUB_OAUTH_CLIENT_ID
//   GITHUB_OAUTH_CLIENT_SECRET

function renderResult({ success, token, error }) {
  const message = success
    ? `authorization:github:success:${JSON.stringify({ token, provider: "github" })}`
    : `authorization:github:error:${JSON.stringify({ error: error || "Невядомая памылка" })}`;

  return `<!doctype html>
<html><body>
<script>
  (function () {
    function receiveMessage(e) {
      window.opener.postMessage(
        ${JSON.stringify(message)},
        e.origin
      );
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
${success ? "Уваход выкананы, можна закрыць гэта акно." : "Памылка ўваходу: " + (error || "")}
</body></html>`;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET) {
    return new Response(
      "GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET не настроены.",
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response(renderResult({ success: false, error: "Адсутнічае code ад GitHub" }), {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenResponse.json();

    if (data.error || !data.access_token) {
      return new Response(
        renderResult({ success: false, error: data.error_description || data.error || "Не атрыманы токен" }),
        { headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }

    return new Response(renderResult({ success: true, token: data.access_token }), {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  } catch (err) {
    return new Response(renderResult({ success: false, error: String(err) }), {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  }
}
