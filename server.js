const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const SENHA = process.env.SENHA || "@Luis2010";   // <-- senha de acesso
const ARQUIVO = path.join(__dirname, "data.json");
const PUBLIC = path.join(__dirname, "public");
const sessoes = new Set();

app.use(express.json({ limit: "1mb" }));

// ---- ajudantes ----
function tokenDoCookie(req) {
  const m = (req.headers.cookie || "").match(/(?:^|; )sessao=([^;]+)/);
  return m ? m[1] : null;
}
function logado(req) { return sessoes.has(tokenDoCookie(req)); }

function exigeLogin(req, res, next) {
  if (logado(req)) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ erro: "não autorizado" });
  res.redirect("/login.html");
}

// ---- páginas livres (antes do login) ----
app.get("/login.html", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/logo.png",   (req, res) => res.sendFile(path.join(PUBLIC, "logo.png")));

app.post("/api/login", (req, res) => {
  if (req.body && req.body.senha === SENHA) {
    const token = crypto.randomBytes(24).toString("hex");
    sessoes.add(token);
    res.setHeader("Set-Cookie",
      `sessao=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    return res.json({ ok: true });
  }
  setTimeout(() => res.status(401).json({ ok: false }), 700); // atrasa tentativas erradas
});

app.post("/api/logout", (req, res) => {
  sessoes.delete(tokenDoCookie(req));
  res.setHeader("Set-Cookie", "sessao=; HttpOnly; Path=/; Max-Age=0");
  res.json({ ok: true });
});

// ---- tudo daqui para baixo exige senha ----
app.use(exigeLogin);

app.get("/api/linhas", (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(ARQUIVO, "utf8"))); }
  catch (e) { res.json(null); }          // ainda não existe: o site usa os dados de exemplo
});

app.put("/api/linhas", (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ erro: "formato inválido" });
  fs.writeFileSync(ARQUIVO, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.use(express.static(PUBLIC));          // index.html, style.css, script.js

app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));