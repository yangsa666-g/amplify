# Amplify（合同 AI 审查平台）

一个基于 AI 的合同分析平台，支持上传、解析和分析法律文件，使用 Azure OpenAI 和 Anthropic Claude 模型提供智能分析能力。

## 功能特性

- **合同分析** — 上传 PDF、DOCX 或 TXT 格式的合同，通过可自定义的字段模板和提示词模板生成结构化 AI 分析报告
- **合同比较** — 对两份合同版本进行并排差异对比，并提供 AI 摘要说明变更内容
- **多模型支持** — 可在 Azure OpenAI（GPT-4、GPT-5 系列）和 Anthropic Claude 模型之间自由切换
- **模板管理** — 创建个人或系统级字段模板和提示词模板，标准化分析流程
- **分析历史** — 浏览和回顾历史分析记录
- **管理员后台** — 管理用户、查看全系统历史记录、配置系统模板
- **External API（对外 API）** — 通过 API Key 鉴权，对外暴露上传 / 分析 / 比较等能力，便于第三方系统集成
- **Microsoft Entra ID 单点登录** — 可选的 Azure Entra ID 单点登录，与本地用户名 / 密码登录并存

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18、Vite、Ant Design、Zustand、TanStack Query、React Router |
| 后端 | NestJS、Prisma ORM、PostgreSQL |
| AI | Azure OpenAI API、Anthropic Claude API |
| 文档解析 | Azure Document Intelligence（OCR）、Mammoth（DOCX） |
| 文件存储 | 本地磁盘（开发环境）/ Azure Blob Storage（生产环境） |
| 认证 | JWT + 刷新令牌；Microsoft Entra ID SSO（OIDC）；API Key（用于 External API） |
| Monorepo | pnpm workspaces、Turborepo |

## 项目结构

```
amplify/
├── apps/
│   ├── api/          # NestJS 后端（端口 3001）
│   └── web/          # React + Vite 前端（端口 3000）
├── packages/         # 共享包
├── deploy/           # nginx、supervisord、entrypoint 配置
├── Dockerfile.azure  # 统一单容器镜像（nginx + NestJS）
├── docker-compose.yml
├── Makefile
├── .env.example
└── .env.azure.example
```

## 前置条件

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Azure OpenAI 资源（必须）
- Azure Document Intelligence 资源（PDF OCR 必须）

## 快速开始（Docker Compose）

```bash
# 1. 克隆仓库并初始化环境
git clone <repo-url>
cd amplify
make setup         # 将 .env.example 复制为 .env，并安装依赖

# 2. 编辑 .env，填入必要的密钥：
#    AZURE_OPENAI_ENDPOINT、AZURE_OPENAI_API_KEY、
#    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT、AZURE_DOCUMENT_INTELLIGENCE_KEY、
#    SEED_ADMIN_EMAIL、SEED_ADMIN_PASSWORD

# 3. 启动所有服务
make up            # 通过 Docker Compose 启动 postgres、api、web

# 4. 执行数据库迁移并初始化数据
make migrate
make seed

# 5. 打开应用
open http://localhost:3000
```

## 本地开发（不使用 Docker）

```bash
pnpm install
pnpm dev           # 同时启动 api（:3001）和 web（:3000）
```

> 需要本地运行 PostgreSQL 实例，并在 `.env` 中正确配置 `DATABASE_URL`。

## 环境变量

将 `.env.example` 复制为 `.env` 并填写相应值。

| 变量名 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 令牌签名密钥 |
| `AZURE_OPENAI_ENDPOINT` | ✅ | Azure OpenAI 端点 URL |
| `AZURE_OPENAI_API_KEY` | ✅ | Azure OpenAI API 密钥 |
| `AZURE_OPENAI_MODELS` | ✅ | 已部署模型名称，逗号分隔 |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | ✅ | Azure Document Intelligence 端点 |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | ✅ | Azure Document Intelligence 密钥 |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic API 密钥（启用 Claude 模型） |
| `ANTHROPIC_MODELS` | ❌ | Claude 模型名称，逗号分隔 |
| `SEED_ADMIN_EMAIL` | ❌ | 初始化管理员账号邮箱 |
| `SEED_ADMIN_PASSWORD` | ❌ | 初始化管理员账号密码 |
| `MAX_UPLOAD_SIZE_MB` | ❌ | 最大上传文件大小，单位 MB（默认 20） |
| `ENTRA_CLIENT_ID` | ❌ | Entra 应用（客户端）ID。留空则完全禁用 SSO |
| `ENTRA_CLIENT_SECRET` | ❌ | Entra 客户端密钥（启用 SSO 时必填） |
| `ENTRA_TENANT_ID` | ❌ | Entra 目录（租户）GUID —— 单租户 |
| `ENTRA_REDIRECT_URI` | ❌ | 公开回调 URL，例如 `https://<host>/api/auth/entra/callback` |
| `ENTRA_POST_LOGIN_REDIRECT` | ❌ | 回调后 SPA 落地页 URL，例如 `https://<host>/auth/callback` |

### Microsoft Entra ID 单点登录（可选）

SSO 与本地登录并存 —— 将 `ENTRA_CLIENT_ID` 留空即可干净地禁用它
（"SSO with Entra ID" 按钮和 `/auth/entra/*` 端点都会关闭）。

整个流程由后端驱动，采用 OAuth2 授权码 + PKCE：Microsoft 重定向到 NestJS 回调，
回调通过 MSAL 校验 `id_token`（签名 / issuer / audience / nonce），随后创建或关联本地用户，
再签发应用自有的 JWT + 刷新令牌 —— 因此认证体系的其余部分保持不变。具体行为：

- **首次登录的租户用户** 会被即时（JIT）自动创建，赋予 `user` 角色；后续由管理员提升权限。
- **存在匹配邮箱的本地账号** 会自动关联到该 Entra 身份（账号切换为 SSO 登录）。这依赖于单租户限制（每次回调都会校验 `tid`）以及 Entra 已验证的邮箱。
- 身份以稳定的 Entra 对象 ID（`oid`）为准，因此用户邮箱变更也不会丢失账号。

**Azure 应用注册**（一次性）：注册一个 **单租户** 应用，添加与 `ENTRA_REDIRECT_URI` 匹配的
**Web** 平台重定向 URI（本地：`http://localhost:3000/api/auth/entra/callback`），
创建客户端密钥，并授予委派的 `openid`、`profile`、`email` 权限。将客户端 / 租户 ID 和密钥
填入 `.env`（本地）或 App Service 设置 / Key Vault（生产环境）。

## 常用 Make 命令

```
make help          # 显示所有可用命令

# 快速开始
make setup         # 首次初始化
make up            # 启动所有服务
make down          # 停止所有服务
make restart       # 重启所有服务

# 数据库
make migrate       # 应用待执行的迁移
make seed          # 初始化数据和管理员用户
make db-reset      # ⚠️ 删除并重建数据库
make db-studio     # 打开 Prisma Studio（http://localhost:5555）
make psql          # 打开 psql 控制台

# 代码质量
make build         # 构建所有包
make typecheck     # TypeScript 类型检查
make lint          # ESLint 代码检查

# Azure 部署
make azure-login   # 登录 Azure CLI
make azure-build   # 在 Azure Container Registry 构建镜像
make azure-deploy  # 完整部署：基础设施 + 构建 + 应用
make azure-logs    # 查看应用日志
make azure-status  # 查看 Web App 状态
```

## Azure 部署

应用支持以**单个 Docker 容器**的方式部署到 **Azure App Service**（nginx 提供前端静态文件，NestJS 提供 API）。

### 所需 Azure 服务

| 服务 | 用途 |
|---|---|
| Azure Container Registry | Docker 镜像存储 |
| Azure App Service | 容器托管 |
| Azure Database for PostgreSQL | 应用数据库 |
| Azure Blob Storage | 文件上传存储 |
| Azure OpenAI | AI 分析 |
| Azure Document Intelligence | PDF OCR |

### 部署步骤

```bash
# 1. 复制并填写 Azure 配置
cp .env.azure.example .env.azure
# 编辑 .env.azure，填入 Azure 资源信息

# 2. 构建镜像并部署到 App Service
make azure-build
make azure-deploy-app
```

## API 概览

后端提供两套独立的 API：

- **Internal API（内部 API）** — 供 Web 前端使用，采用 JWT 访问令牌 + 刷新令牌进行鉴权。
- **External API（对外 API，`/v1/*`）** — 面向第三方系统集成，使用 API Key 鉴权。

API 运行时，可在 `http://localhost:3001/docs` 访问完整的 OpenAPI 文档。

### Internal API（部分常用端点）

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/auth/login` | 邮箱密码登录 |
| `POST` | `/auth/refresh` | 刷新访问令牌 |
| `POST` | `/documents/upload` | 上传合同文件 |
| `GET` | `/documents/:id/text` | 获取提取的文本内容 |
| `POST` | `/analysis` | 执行合同分析 |
| `GET` | `/analysis/:id` | 获取分析结果 |
| `POST` | `/compare` | 比较两份合同 |
| `GET` | `/models` | 列出可用的 AI 模型 |
| `GET` | `/field-templates` | 列出字段模板 |
| `GET` | `/prompt-templates` | 列出提示词模板 |

### External API（对外 API）

External API 允许外部系统在不经过用户登录的前提下，使用与 Web 应用相同的 上传 → 分析 / 比较 工作流。所有端点统一挂载在 `/v1` 下，需通过 API Key 鉴权。

**鉴权方式。** 在每次请求中通过 `X-API-Key` 请求头携带 API Key。Key 在管理员后台签发与吊销，每个 Key 绑定到某个用户账号，调用所产生的权限与配额继承自该用户。

```http
X-API-Key: <your-api-key>
```

**端点列表：**

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/v1/documents/upload` | 上传合同（`multipart/form-data`，最大 50 MB），返回 `documentId`。文本抽取为异步执行，需轮询直到 `textExtractionStatus` 为 `success`。 |
| `POST` | `/v1/analysis/run` | 对已上传的文档执行字段抽取与风险分析，同步返回，通常耗时 10–60 秒。 |
| `GET`  | `/v1/analysis/:id` | 查询历史分析任务结果。 |
| `POST` | `/v1/compare/run` | 对两份已上传文档执行行级差异对比。 |
| `GET`  | `/v1/compare/:id` | 查询历史比较任务结果。 |

**示例 — 完整分析流程：**

```bash
# 1. 上传合同
DOC_ID=$(curl -s -X POST http://localhost:3001/v1/documents/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@contract.pdf" | jq -r .id)

# 2. 待 textExtractionStatus = success 后，执行分析
curl -X POST http://localhost:3001/v1/analysis/run \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"documentId\": \"$DOC_ID\", \"model\": \"gpt-5.4\"}"
```

完整的请求 / 响应结构请参阅 `/docs`。

## 许可证

详见 [LICENSE](LICENSE)。
