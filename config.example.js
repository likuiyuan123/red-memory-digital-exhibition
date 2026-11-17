/*
 * 大模型接口配置示例（复制本文件为 config.local.js 后填入真实 Key）
 * ---------------------------------------------------------------
 * config.local.js 已加入 .gitignore，不会提交到公开仓库；
 * 页面读取优先级：window.__AI_CONFIG__（本文件）→ 浏览器本机 localStorage → 空默认。
 * 也可以不使用本文件，直接在页面右上角「接口设置」中填写，Key 仅保存在本机浏览器。
 *
 * 浏览器直连厂商接口若被 CORS 拦截，请把 apiBase 改为你自建的后端代理地址，
 * 真实 Key 由后端环境变量注入，前端不接触 Key。
 */

window.__AI_CONFIG__ = {
  // OpenAI 兼容 Chat Completions 接口地址
  apiBase: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  // 你的 API Key（示例留空，请勿把真实 Key 提交到仓库）
  apiKey: "",
  // 模型名
  model: "glm-4.7-flash",
  // 采样温度 0~1
  temperature: 0.7,
  // 可选：embedding 向量接口地址（用于 RAG 语义检索）；留空时按 apiBase 自动推导。
  // 智谱：自动推到 https://open.bigmodel.cn/api/paas/v4/embeddings ；
  // 本地代理：自动推到 http://localhost:8787/embeddings ；
  // 不支持向量接口的厂商（如 DeepSeek）留空即可，前端自动降级为纯关键词检索。
  embeddingBase: "",
  // 可选：向量模型名，默认 embedding-3
  embeddingModel: ""
};

/* 可选预设端点（OpenAI 兼容 Chat Completions）：
 * 智谱 GLM  : apiBase = https://open.bigmodel.cn/api/paas/v4/chat/completions , model = glm-4.7-flash（免费；高峰 429 可改 glm-4.5-airx，需账户额度）
 * DeepSeek  : apiBase = https://api.deepseek.com/chat/completions          , model = deepseek-chat
 * 本地代理  : apiBase = http://localhost:8787/chat/completions              , model = glm-4.7-flash 或 glm-4.5-airx
 *             （先 `$env:LLM_API_KEY="你的Key"; node llm-proxy.js` 启动；Key 在代理环境变量，前端填占位串）
 */
