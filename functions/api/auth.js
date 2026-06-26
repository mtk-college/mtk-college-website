// functions/api/auth.js
//
// Першы крок OAuth-уваходу ў Decap CMS праз GitHub.
// Decap CMS адкрывае гэты адрас у новым акне, а мы перанакіроўваем
// карыстальніка на старонку аўтарызацыі GitHub.
//
// Патрабуе пераменную асяроддзя GITHUB_OAUTH_CLIENT_ID
// (Cloudflare Pages → Settings → Environment variables).

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.GITHUB_OAUTH_CLIENT_ID) {
    return new Response(
      "GITHUB_OAUTH_CLIENT_ID не настроены. Звярніцеся да адміністратара сайта.",
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/callback`;

  const githubAuthUrl =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${encodeURIComponent(env.GITHUB_OAUTH_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent("repo,user")}`;

  return Response.redirect(githubAuthUrl, 302);
}
