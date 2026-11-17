#!/usr/bin/env node
/*
 * 本地大模型代理（零依赖，仅用 Node 内置模块）
 * ------------------------------------------------------------------
 * 作用：浏览器前端 → 本代理 → 厂商大模型端点。
 *   1. 真实 API Key 只存在后端环境变量 LLM_API_KEY，前端与页面源码都不接触 Key；
 *   2. 厂商端点若不返回浏览器跨域放行头（CORS），由本代理统一回写 CORS 头并转发；
 *   3. 流式（SSE）与非流式响应都原样透传。
 *
 * 启动（PowerShell，在本目录下）：
 *   $env:LLM_API_KEY="你的大模型 Key"
 *   node llm-proxy.js
 *
 * 启动后，在页面 AI 抽屉「接口设置」中这样填：
 *   接口地址：http://localhost:8787/chat/completions
 *   模型名  ：glm-4.7-flash（或 LLM_MODEL 指定的模型）
 *   API Key ：填任意非空占位串（如 local-proxy），真实 Key 由代理注入
 *
 * 可选环境变量：
 *   PORT          监听端口，默认 8787
 *   LLM_UPSTREAM  上游 chat/completions 地址，默认智谱 GLM 端点
 *   EMBED_UPSTREAM 上游 embeddings 向量接口地址，默认智谱 embedding 端点
 *   LLM_MODEL     强制覆盖请求体模型名；不设置则透传前端传来的 model
 */
"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");

// 启动时读取同目录 .env（若存在），补充到环境变量；已显式设置的环境变量优先，不被覆盖。
// .env 已被 .gitignore 忽略，真实 Key 只保存在本机，不进入仓库。
(function loadDotEnv() {
  try {
    const envFile = path.join(__dirname, ".env");
    if (!fs.existsSync(envFile)) return;
    fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return;
      const eq = t.indexOf("=");
      if (eq < 0) return;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (k && process.env[k] == null) process.env[k] = v;
    });
  } catch (e) { /* .env 缺失或解析失败不阻断代理启动 */ }
})();

const PORT = Number(process.env.PORT || 8787);
const UPSTREAM = process.env.LLM_UPSTREAM || "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const EMBED_UPSTREAM = process.env.EMBED_UPSTREAM || "https://open.bigmodel.cn/api/paas/v4/embeddings";
const API_KEY = process.env.LLM_API_KEY || "";
const FORCE_MODEL = process.env.LLM_MODEL || "";
const MAX_BODY = 1024 * 1024; // 1MB，防止异常大请求

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400"
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({}, CORS, { "Content-Type": "application/json; charset=utf-8" }));
  res.end(body);
}

const server = http.createServer((req, res) => {
  // CORS 预检
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // 健康检查（不暴露 Key）
  if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
    sendJson(res, 200, { ok: true, proxy: "llm-proxy", upstream: UPSTREAM, keyConfigured: !!API_KEY });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (!API_KEY) {
    sendJson(res, 500, { error: "代理未配置 LLM_API_KEY 环境变量" });
    return;
  }

  const chunks = [];
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY) { req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch (e) {
      sendJson(res, 400, { error: "请求体不是合法 JSON" });
      return;
    }
    if (FORCE_MODEL) payload.model = FORCE_MODEL;

    const isEmbed = req.url.indexOf("/embeddings") === 0;
    const UP = isEmbed ? EMBED_UPSTREAM : UPSTREAM;

    let up;
    try { up = new URL(UP); }
    catch (e) { sendJson(res, 500, { error: "上游接口地址非法" }); return; }

    const upstreamBody = JSON.stringify(payload);
    const upReq = https.request({
      protocol: up.protocol,
      hostname: up.hostname,
      port: up.port || 443,
      path: up.pathname + up.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY,
        "Content-Length": Buffer.byteLength(upstreamBody)
      }
    }, (upRes) => {
      res.writeHead(upRes.statusCode || 502, Object.assign({}, CORS, {
        "Content-Type": upRes.headers["content-type"] || "application/json; charset=utf-8"
      }));
      upRes.pipe(res); // 流式 SSE / 普通 JSON 都原样透传
    });

    upReq.on("error", (err) => {
      sendJson(res, 502, { error: "上游模型请求失败: " + (err && err.message ? err.message : "网络异常") });
    });
    upReq.write(upstreamBody);
    upReq.end();
  });
});

server.listen(PORT, () => {
  console.log("[llm-proxy] 已启动: http://localhost:" + PORT + "/chat/completions");
  console.log("[llm-proxy] 上游: " + UPSTREAM);
  console.log("[llm-proxy] Key " + (API_KEY ? "已从环境变量读取" : "未配置（LLM_API_KEY 为空）"));
});
