"use strict";

/* Servidor local sin dependencias: archivos estáticos + /api/ai. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const {spawn} = require("child_process");
const handler = require("./api/ai");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".svg":"image/svg+xml",
  ".mp3":"audio/mpeg",
  ".mp4":"video/mp4",
  ".srt":"text/plain; charset=utf-8",
  ".webp":"image/webp"
};

function loadEnv(){
  const file = path.join(ROOT, ".env.local");
  if(!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if(match && process.env[match[1].trim()] === undefined)
      process.env[match[1].trim()] = match[2].trim();
  });
}

function sendJson(res, status, body){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req){
  return new Promise(resolve => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if(raw.length > 300000) req.destroy();
    });
    req.on("end", () => {
      try{ resolve(raw ? JSON.parse(raw) : {}); }
      catch(error){ resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

async function apiRequest(req, res){
  const body = req.method === "POST" ? await readBody(req) : {};
  const apiRes = {
    status(code){ res.statusCode = code; return this; },
    setHeader(name, value){ res.setHeader(name, value); },
    json(payload){ res.end(JSON.stringify(payload)); },
    end(){ res.end(); }
  };
  try{ await handler({method:req.method, headers:req.headers, body}, apiRes); }
  catch(error){ console.error("API local error:", error.message); sendJson(res, 500, {error:"LOCAL_SERVER_ERROR", message:"Error interno del servidor local."}); }
}

function serveStatic(req, res){
  const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const file = path.resolve(ROOT, relative);
  if(file !== ROOT && !file.startsWith(ROOT + path.sep)) return sendJson(res, 403, {error:"FORBIDDEN"});
  fs.stat(file, (error, stat) => {
    if(error || !stat.isFile()) return sendJson(res, 404, {error:"NOT_FOUND"});
    res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
}

loadEnv();
const server = http.createServer((req, res) => {
  if((req.url || "").split("?")[0] === "/api/ai") return apiRequest(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log("Mind Glow iniciado. El navegador se abrirá automáticamente.");
  console.log(process.env.AI_API_KEY ? "Gemini configurada en el servidor local." : "Falta AI_API_KEY en .env.local.");
  if(process.env.MINDGLOW_NO_BROWSER !== "1"){
    if(process.platform === "win32") spawn("cmd.exe", ["/c", "start", "", url], {stdio:"ignore", detached:true}).unref();
    else if(process.platform === "darwin") spawn("open", [url], {stdio:"ignore", detached:true}).unref();
    else spawn("xdg-open", [url], {stdio:"ignore", detached:true}).unref();
  }
});
