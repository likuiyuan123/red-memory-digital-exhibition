# 新电脑运行与 AI 接入指引

本说明用于把「红色记忆数字展馆」作品拷贝到另一台电脑（比赛现场电脑 / 演示机）后，恢复浏览与 AI 功能。请按顺序操作；作品本身不依赖大模型也能离线浏览全部固定内容。

## 一、先分清：哪些功能不依赖 AI / 网络

**不接模型、不联网也能用：**
- 15 个历史事件节点、17 个红色故事、14 个词条、7 则名言、15 道内置单选题；
- 三维 / 二维展厅、事件地图、时间轴、栏目卡片墙、事件与故事弹窗；
- 本地 TTS 语音朗读（浏览器原生合成，不消耗模型额度）；
- 已读故事、测验最佳成绩、已探访记录、反思作答等本机记录。

**需要联网：**
- 三维展厅的 three.js 库走 jsDelivr CDN；离线时页面自动降级为 2D 视图，不影响浏览；
- 浏览器语音识别（ASR）提问，部分浏览器依赖网络；
- 大模型问答、AI 出题、RAG 语义向量检索。

**兜底行为：** 未配置模型或接口失败时，AI 问答自动回退到本地资料检索并附来源，AI 出题回退到本地题库组卷，页面始终可用，不会白屏。

## 二、拷贝到新电脑

1. 把整个 `changzheng-exhibition/` 目录一起拷贝，至少包含：
   - `长征精神数字展馆.html`（主页面，内联全部样式 / 脚本 / 数据 / 图片字典）
   - `assets/` 文件夹（事件场景图备份，与 HTML 保持同目录）
   - `llm-proxy.js`（本地 / 后端代理脚本）
   - `config.example.js`（配置模板，不含真实 Key）
   - `README.md`、本指引
2. `config.local.js` 是本机私有配置（含真实 Key），已被 `.gitignore` 忽略，不会随公开仓库提交；如果是从 Git 仓库 clone 到新电脑，该文件不存在，按第三节重新配置即可。
3. 用 Chrome 或 Edge 打开 `长征精神数字展馆.html`，无需安装构建工具、无需启动静态服务器。

## 三、接通 AI：先按手里的 Key 选一条路径

| 路径 | 适用条件 | 是否要装 Node | Key 存放位置 |
| --- | --- | --- | --- |
| 路径一：浏览器直连 DeepSeek | 有**有余额 / 额度**的 DeepSeek Key，新电脑能访问 api.deepseek.com | 否 | 新电脑浏览器本机存储 |
| 路径二：本地 Node 代理 | 用智谱 GLM Key，或希望 Key 放在本机后端、前端只存占位串 | 是（Node 16+） | 代理环境变量 |
| 路径三：线上公网代理 | 代理已部署到一台公网服务器，多台电脑免重填 | 否（浏览器只访问线上地址） | 服务器环境变量 |

> 实测结论：**智谱 GLM 端点不返回浏览器跨域放行头（CORS），纯前端直连会被拦截，必须走代理**；**DeepSeek 端点允许浏览器跨域直连**。

### 路径一：浏览器直连 DeepSeek（免装 Node，最简单）

1. 打开页面，进入右侧「AI 助手」抽屉，点右上角「接口设置」。
2. 接口预设选择「DeepSeek（deepseek-chat）」，确认 / 填写：
   - 接口地址：`https://api.deepseek.com/chat/completions`
   - 模型名：`deepseek-chat`
   - API Key：粘贴你的 DeepSeek Key
3. 向量接口（embedding）留空即可——DeepSeek 不提供向量接口，前端会自动降级为纯关键词检索，问答与出题不受影响。
4. 点「保存配置」。Key 只保存在这台电脑的浏览器里；换电脑需要重新填写。

### 路径二：新电脑本地起 Node 代理（智谱必须走这条）

**前置：** 先安装 Node.js 16 或更高版本；在 PowerShell 执行 `node -v` 能出版本号即为就绪。

1. 在作品目录打开 PowerShell，注入 Key 并启动代理（窗口需保持开启，关闭即断网）：

   ```powershell
   $env:LLM_API_KEY="你的厂商Key"
   node llm-proxy.js
   ```

   可选环境变量：
   - `PORT`：监听端口，默认 `8787`
   - `LLM_UPSTREAM`：上游聊天端点，默认智谱 GLM
   - `EMBED_UPSTREAM`：上游向量端点，默认智谱 embeddings
   - `LLM_MODEL`：强制覆盖模型名

2. 回到页面「AI 助手 → 接口设置」填写：
   - 接口地址：`http://localhost:8787/chat/completions`
   - 模型名：`glm-4.5-airx`（高峰限流可试 `glm-4.7-flash`）
   - API Key：填任意非空占位串，如 `local-proxy`（真实 Key 由代理从环境变量注入，前端不接触）
3. 向量地址留空，前端会按本地代理自动推导 `http://localhost:8787/embeddings`。

**常用上游端点：**

| 提供方 | 聊天端点 apiBase | 模型 |
| --- | --- | --- |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | `glm-4.5-airx` / `glm-4.7-flash` |
| DeepSeek | `https://api.deepseek.com/chat/completions` | `deepseek-chat` |

### 路径三：线上公网代理（多台电脑免重填，现场最稳）

若已把 `llm-proxy.js` 部署到公网服务器（Key 配在服务器环境变量），在页面「接口设置」填写：

- 接口地址：`https://你的代理域名/chat/completions`
- 模型名：与服务器 `LLM_MODEL` 配置一致
- API Key：填占位串（如 `proxy-local`），真实 Key 由线上代理注入
- 向量地址（配智谱 embedding 时）：`https://你的代理域名/embeddings`

新电脑只要浏览器能访问该线上地址即可，无需装 Node、无需本机起代理、无需带 Key。

## 四、验证是否真正接通

1. 在 AI 助手发一条展馆问题，例如「遵义会议是哪一年召开的？」。
2. **成功：** 返回模型生成的真实回复，回答下方标注「资料来源」；在事件 / 故事 / 测验区能由模型生成新练习题。
3. **仍走兜底：** 若提示「已切换到本地资料 / 本地题库」，说明模型接口没接通，按第五节排查。

## 五、常见问题排查

| 现象 | 可能原因 | 处理办法 |
| --- | --- | --- |
| `Failed to fetch` / 无法连接 | 本地代理没启动；接口地址填错；断网；浏览器被 CORS 拦截；本机浏览器残留旧配置覆盖 | 确认代理窗口在运行、地址为 `http://localhost:8787/chat/completions`；智谱不要填厂商直连地址；在设置面板点「清除配置」后按路径重新填写并保存 |
| HTTP 401 | Key 无效、复制不全或多了空格 | 重新完整粘贴 Key；代理方式确认环境变量已注入 |
| HTTP 402 `Insufficient Balance` | 厂商账户余额 / 额度不足 | 充值，或更换有额度的 Key |
| HTTP 429 | 高峰限流 / 免费额度用尽 | 稍后重试；更换模型名（如 `glm-4.5-airx`）；仍失败则走本地兜底 |
| 模型名报错 / 404 | 模型名与上游不匹配 | 对照第三节端点表核对模型名 |
| 三维展厅不显示 | CDN 未加载（离线或网络受限） | 联网刷新；页面会自动降级 2D 视图 |
| 语音提问麦克风不出现 | 浏览器不支持 ASR 或缺语音包 | 改用文字输入；朗读（TTS）一般仍可用 |
| 换浏览器后配置丢失 | Key 只存在原浏览器本机存储 | 在新浏览器设置面板重新填写 |

## 六、可直接粘贴给新电脑 AI 助手的提示词

把下面整段复制给新电脑上的 AI 助手，尖括号处按实际情况替换：

```
我在新电脑上要运行一个单文件红色展馆 Web 作品，目录是 <拷贝后的目录路径>，主文件是「长征精神数字展馆.html」。请帮我在这台电脑上把作品跑起来并接通大模型：

1. 先确认目录文件齐全（HTML、assets 文件夹、llm-proxy.js、config.example.js、README.md）；用 Chrome / Edge 打开 HTML，确认展厅、地图、故事、题库能正常浏览。
2. 大模型接入按我手里的 Key 选择：
   - 若我提供的是 DeepSeek Key：走浏览器直连，接口地址 https://api.deepseek.com/chat/completions，模型 deepseek-chat，在页面 AI 助手「接口设置」里填入并保存；不要配置向量接口。
   - 若我提供的是智谱 GLM Key：智谱不允许浏览器直连，请用目录下 llm-proxy.js 起本地代理：先确认 Node 已安装（node -v），在目录 PowerShell 执行 $env:LLM_API_KEY="我的Key" 后 node llm-proxy.js，保持窗口开启；页面接口设置填地址 http://localhost:8787/chat/completions，模型 glm-4.5-airx，Key 填占位 local-proxy。
3. 接通后发一条展馆问题（如“遵义会议是哪一年召开的”）验证：能拿到带资料来源的真实回复即为成功；若模型接口失败，作品会自动回退本地资料检索和本地题库，属正常兜底。
4. 真实 Key 只允许写入被 gitignore 的 config.local.js、代理环境变量或页面本机浏览器存储；禁止把 Key 写进 HTML 源码、配置模板、README、文档或 Git 提交，也不要在回复里完整回显我的 Key。
5. 如遇 Failed to fetch、401、402、429、CORS 等报错，请定位原因并给出可直接执行的修复命令。

我提供的 Key：<在这里粘贴>；厂商：<DeepSeek / 智谱>。
```

## 七、安全提醒

- 真实 API Key 不得写进 HTML 源码、`config.example.js`、README、技术文档 PDF、视频字幕或公开 Git 提交；只允许放在被 `.gitignore` 忽略的 `config.local.js`、代理环境变量或页面本机浏览器存储中。
- 不要把含 Key 的配置截图外发；演示时如需展示接口设置面板，先把 Key 一栏遮挡。
- 走公网代理时，代理应加访问口令或 IP 白名单，避免地址公开后被他人刷模型额度。
