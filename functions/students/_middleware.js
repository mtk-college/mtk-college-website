// functions/students/_middleware.js
//
// Захоўвае раздзел /students/* за адзіным паролем для ўсіх студэнтаў.
// Не патрабуе базы даных і не вядзе спіс email — пароль захоўваецца
// толькі ў наладах Cloudflare (Environment Variables), не ў гэтым файле
// і не ў рэпазіторыі.
//
// Наладка (адзін раз):
//   1. У панелі Cloudflare Pages → ваш праект → Settings → Environment variables
//      дадайце пераменную STUDENTS_PASSWORD са значэннем сапраўднага пароля.
//   2. (Неабавязкова) дадайце STUDENTS_SALT — любы выпадковы радок,
//      які павышае бяспеку "кукі". Калі не зададзены, выкарыстоўваецца
//      стандартнае значэнне ніжэй.
//   3. Дэплой адбудзецца аўтаматычна пры наступным push у рэпазіторый.
//
// Як гэта працуе:
//   - Кожны запыт да /students/* спачатку трапляе сюды.
//   - Калі ў браўзера ўжо ёсць правільная "кука" (студэнт ужо ўвайшоў
//     раней і не выйшаў/не ачысціў кукі) — паказваецца сапраўдная старонка.
//   - Калі няма — паказваецца простая форма ўводу пароля.
//   - Пры правільным паролі ставіцца кука на 30 дзён, і студэнт трапляе
//     на запытаную старонку.

const COOKIE_NAME = "mtk_auth";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 дзён

async function hashValue(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

function renderLoginPage({ error = false } = {}) {
  return `<!DOCTYPE html>
<html lang="be">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Уваход — Студэнтам</title>
<style>
  *{box-sizing:border-box;}
  body{font-family:'PT Sans',Arial,sans-serif; background:#102742; color:#faf7f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px;}
  .box{background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:40px 32px; max-width:360px; width:100%; text-align:center;}
  h1{font-family:Georgia,serif; font-size:20px; margin:0 0 8px;}
  p{font-size:14px; color:rgba(250,247,240,0.7); margin:0 0 24px; line-height:1.5;}
  input[type=password]{width:100%; padding:11px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.25); background:rgba(255,255,255,0.07); color:#faf7f0; font-size:15px; margin-bottom:14px;}
  input[type=password]::placeholder{color:rgba(250,247,240,0.4);}
  button{width:100%; padding:12px; border-radius:8px; border:none; background:#ae8a3d; color:#102742; font-weight:700; font-size:15px; cursor:pointer;}
  button:hover{opacity:0.92;}
  .error{color:#f0a8a8; font-size:13px; margin:-4px 0 14px;}
</style>
</head>
<body>
  <form class="box" method="POST">
    <h1>Раздзел для студэнтаў</h1>
    <p>Увядзіце пароль, які паведаміла адміністрацыя каледжа.</p>
    <input type="password" name="password" placeholder="Пароль" autofocus required>
    ${error ? '<div class="error">Няправільны пароль. Паспрабуйце яшчэ раз.</div>' : ""}
    <button type="submit">Увайсці</button>
  </form>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;

  if (!env.STUDENTS_PASSWORD) {
    return new Response(
      "Пароль для раздзела не настроены. Звярніцеся да адміністратара сайта (патрэбна задаць STUDENTS_PASSWORD).",
      { status: 500 }
    );
  }

  const salt = env.STUDENTS_SALT || "mtk-default-salt";
  const expectedCookieValue = await hashValue(env.STUDENTS_PASSWORD + salt);
  const cookies = parseCookies(request.headers.get("Cookie"));

  if (cookies[COOKIE_NAME] === expectedCookieValue) {
    return next();
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const submitted = (formData.get("password") || "").toString();

    if (submitted === env.STUDENTS_PASSWORD) {
      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        `${COOKIE_NAME}=${expectedCookieValue}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`
      );
      headers.set("Location", request.url);
      return new Response(null, { status: 302, headers });
    }

    return new Response(renderLoginPage({ error: true }), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  }

  return new Response(renderLoginPage({ error: false }), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}
