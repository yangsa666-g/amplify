# 公司级用户访问控制技术设计

## 1. 文档目的

本文档定义 Amplify 合同 AI 审查平台从“用户级数据隔离 + 全局 Admin”升级为“平台级 Super Admin + 公司级 Admin/User”的技术方案。本文是后续 AI 开发与代码评审的实现依据。

配套开发步骤见 [team-level-user-access-development-plan.md](./team-level-user-access-development-plan.md)。

## 2. 项目现状

### 2.1 技术架构

- Monorepo：pnpm workspaces + Turborepo。
- Web：React 18、Vite、Ant Design、Zustand、TanStack Query、React Router。
- API：NestJS、Passport JWT、Prisma ORM。
- 数据库：PostgreSQL。
- 登录：本地邮箱密码、Microsoft Entra ID 单租户 SSO。
- External API：`X-API-Key` 鉴权。

### 2.2 当前权限模型

- `User.role` 只有 `admin`、`user`。
- `user` 的合同、分析、对比、个人模板等数据通过 `userId` 隔离。
- `admin` 是全平台角色，可以绕过 `userId` 限制读取所有用户数据。
- 用户管理、全量历史、审计、仪表盘、系统模板、模型配置和 API Key 均为全局范围。
- JWT 直接携带角色，`JwtStrategy` 不会在每个请求中重新读取用户状态和角色。
- Entra SSO 会为未知用户即时创建账号。
- 删除用户会因级联关系删除其合同、分析、模板等业务数据。
- API Key 全平台最多一把，并绑定创建它的用户。

## 3. 目标与非目标

### 3.1 目标

1. 引入公司（`Organization`）作为唯一租户边界。
2. 支持三种角色：平台级 `super_admin`、公司级 `admin`、公司级 `user`。
3. 公司之间的业务数据、模板、模型配置、API Key、历史和审计完全隔离。
4. 公司 Admin 管理本公司用户，并查看本公司仪表盘、全部历史和审计记录。
5. User 仍然只能访问自己的业务数据。
6. Super Admin 不属于任何公司，可管理所有公司，并在明确选择公司后访问或维护该公司的数据与配置。
7. 保留平台默认模板和平台提供的基础模型，同时允许每家公司独立配置。
8. 用户或公司停用、角色变更后立即生效。
9. 安全迁移全部存量用户、业务数据和配置。

### 3.2 非目标

- 不支持部门或多级组织架构。
- 一个用户不能同时属于多家公司。
- 不开发邮件邀请系统；Admin 直接创建账号。
- 不允许 Entra SSO 自动注册未知用户。
- 不实现用户模拟登录。
- 不硬删除公司或用户。
- 首期不改变“一家公司最多一把有效 External API Key”的规则。

## 4. 已确认的业务规则

### 4.1 角色定义

| 角色 | 公司归属 | 数据范围 | 管理能力 |
|---|---|---|---|
| Super Admin | 无 | 全平台；访问租户数据时需选择公司 | 创建/停用公司，跨公司管理用户，维护平台默认配置，代管公司配置 |
| Admin | 必须且仅属于一家公司 | 本公司所有用户的数据 | 管理本公司用户、模板、模型、API Key，查看本公司仪表盘、历史和审计 |
| User | 必须且仅属于一家公司 | 仅本人数据 | 使用分析、对比、个人模板和个人历史 |

### 4.2 数据访问判定

对带有 `organizationId` 和 `userId` 的业务数据，统一使用以下过滤规则：

```text
User:
  organizationId = 当前用户.organizationId
  AND userId = 当前用户.id

Admin:
  organizationId = 当前用户.organizationId

Super Admin:
  organizationId = 明确选择的目标公司
```

不得再使用 `role === 'admin' ? { id } : { id, userId }` 这类无公司边界的查询。

公司 Admin 对其他用户业务数据的跨用户权限仅限查看和下载；不能冒充用户、修改其业务记录或提交/修改其反馈。Admin 自己创建业务数据和提交本人反馈时，仍按普通用户写入规则执行。Super Admin 始终以自己的身份操作，不生成目标用户会话。

### 4.3 公司 Admin 管理规则

- 只能查看和管理本公司 Admin/User。
- 可以创建本公司 User 或 Admin。
- 可以修改其他本公司用户的基本信息、角色和状态。
- 不能查看、创建、修改或删除 Super Admin。
- 不能把用户提升为 Super Admin。
- 不能移动用户到其他公司。
- 不能降级或停用本公司最后一名有效 Admin。
- 不能修改自己的角色或停用自己的账号，沿用当前自操作保护。

### 4.4 Super Admin 管理规则

- 不属于任何公司，`organizationId` 必须为 `null`。
- 可以创建、编辑和停用公司。
- 创建正常可用的新公司时，必须在同一流程中创建或指定第一名 Admin。
- 可以把 Super Admin 调整为某家公司的 Admin/User；此时必须选择公司。
- 可以把公司用户提升为 Super Admin；此时清空其公司归属。
- 如果被调整者是原公司的最后一名有效 Admin，必须先指定替代 Admin。
- 用户转换公司或角色不会改变历史业务数据的公司归属。
- Super Admin 默认停留在 `Platform Defaults`。该上下文既用于平台默认配置，也允许 SA 运行合同分析、合同对比和历史查看。
- `Platform Defaults` 下产生的业务数据不暴露为独立公司；后端使用隐藏的 `platform_defaults` 组织记录承载必需的 `organization_id`。

### 4.5 停用规则

- “删除用户”在 UI 和 API 语义上改为停用，不删除业务数据。
- 公司停用后，该公司所有 Admin/User 均不能登录、刷新令牌或调用 API。
- 公司 API Key 在公司停用后立即失效。
- Super Admin 仍可查看和重新启用已停用公司。
- 硬删除仅可作为未来独立的数据清理能力，不属于本功能。

## 5. 数据模型设计

### 5.1 枚举

```prisma
enum Role {
  super_admin
  admin
  user
}

enum OrganizationStatus {
  active
  disabled
}

enum TemplateScope {
  platform
  organization
  personal
}
```

### 5.2 Organization

```prisma
model Organization {
  id        String             @id @default(cuid())
  name      String
  status    OrganizationStatus @default(active)
  createdAt DateTime           @default(now()) @map("created_at")
  updatedAt DateTime           @updatedAt @map("updated_at")

  users                 User[]
  documents             Document[]
  analysisJobs          AnalysisJob[]
  compareJobs           CompareJob[]
  fieldTemplates        FieldTemplate[]
  promptTemplates       PromptTemplate[]
  templateRequests      TemplateRequest[]
  notifications         Notification[]
  apiKey                ApiKey?
  auditLogs             AuditLog[]
  customModels          OpenAICompatibleModel[]
  modelSettings         OrganizationModelSetting[]

  @@index([status])
  @@map("organizations")
}
```

公司名称首期不作为安全标识，所有关系和 API 均使用不可变 `id`。名称是否允许重复由服务层校验；建议首期拒绝大小写不敏感的重名，避免后台选择错误。

### 5.3 User

在现有 `User` 上增加公司归属：

```prisma
model User {
  // existing fields...
  role           Role          @default(user)
  organizationId String?       @map("organization_id")
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: Restrict)

  @@index([organizationId, role, status])
}
```

数据库与服务层必须维持以下不变量：

```text
role = super_admin  => organization_id IS NULL
role IN (admin,user) => organization_id IS NOT NULL
```

Prisma schema 无法完整表达该条件，应在迁移 SQL 中增加 PostgreSQL `CHECK` constraint，并在服务层进行同样校验。

### 5.4 业务数据的租户快照

以下表增加非空 `organizationId`：

- `Document`
- `AnalysisJob`
- `CompareJob`
- `TemplateRequest`
- `Notification`
- `ApiKey`
- `OpenAICompatibleModel`

以下表增加可空 `organizationId`：

- `AuditLog`：平台级操作为 `null`，公司级操作记录目标公司。

建议对 `Document`、`AnalysisJob`、`CompareJob` 同时保留 `userId` 和 `organizationId`。`userId` 表示创建者，`organizationId` 是创建时的租户归属快照。用户以后变更公司不会带走历史数据。

主要索引：

```prisma
@@index([organizationId, userId, createdAt])
@@index([organizationId, createdAt])
```

结果表和关联表可通过所属 Job/Document 继承租户边界，不必重复增加 `organizationId`，但所有入口查询必须先校验根实体。

### 5.5 模板作用域

`FieldTemplate` 和 `PromptTemplate` 从 `isSystem` 二元状态升级为明确的三种作用域：

| scope | organizationId | userId | 可见范围 | 可编辑者 |
|---|---|---|---|---|
| `platform` | `null` | `null` | 所有公司 | Super Admin |
| `organization` | 非空 | `null` | 指定公司 | 该公司 Admin、Super Admin |
| `personal` | 非空 | 非空 | 创建者本人 | 创建者本人 |

建议移除 `isSystem`，由 `scope` 作为唯一事实来源。为降低前端一次性改动，API 过渡期可以返回兼容字段，但后端不得同时依赖两套状态。

模板列表规则：

- User：平台模板 + 本公司模板 + 本人个人模板。
- Admin：同上；在 System Settings 中仅管理本公司模板。
- Super Admin 平台上下文：管理平台模板。
- Super Admin 公司上下文：管理目标公司的公司模板。

默认模板解析优先级：

```text
公司默认模板 > 平台默认模板
```

数据库应使用 PostgreSQL partial unique index 保证：

- 每类平台模板最多一个默认值。
- 每家公司、每类模板最多一个公司默认值。

个人模板申请升级时：

- `TemplateRequest.organizationId` 固定为申请人当时的公司。
- 只通知同公司有效 Admin。
- 只允许同公司 Admin 或选中该公司的 Super Admin 审批。
- 批准后复制为 `organization` 模板，不再升级成平台模板。

### 5.6 模型配置

平台环境模型和公司配置分离：

1. 现有 `ModelCatalogSetting` 保留为平台基础模型目录/默认配置，由 Super Admin 在“平台默认配置”上下文维护。
2. 新增 `OrganizationModelSetting`，保存每家公司对模型的启用状态、显示名称、排序、默认推理强度及默认模型选择。
3. `OpenAICompatibleModel` 增加非空 `organizationId`，自定义模型只属于一家公司。
4. 自定义模型唯一性从全局 `name` 改为 `@@unique([organizationId, name])`。

示意模型：

```prisma
model OrganizationModelSetting {
  id                     String       @id @default(cuid())
  organizationId         String       @map("organization_id")
  modelName              String       @map("model_name")
  label                  String?
  enabled                Boolean      @default(true)
  defaultReasoningEffort String?       @map("default_reasoning_effort")
  sortOrder              Int?         @map("sort_order")
  isDefault              Boolean      @default(false) @map("is_default")
  createdAt              DateTime     @default(now()) @map("created_at")
  updatedAt              DateTime     @updatedAt @map("updated_at")
  organization           Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)

  @@unique([organizationId, modelName])
  @@index([organizationId, enabled, sortOrder])
  @@map("organization_model_settings")
}
```

模型解析规则：

- 平台基础模型是公司可配置模型的初始集合。
- 新公司继承平台默认启用、顺序和默认模型；首次修改时创建公司覆盖记录。
- 公司自定义模型只加入本公司的模型目录。
- 同一公司的自定义模型名称不能与平台模型名称或本公司其他模型名称冲突；不同公司之间允许同名。
- 执行分析时必须根据请求主体的公司上下文解析模型，不能仅按全局名称查询。
- 每家公司必须最多一个默认模型；如果公司未配置默认模型，则回退平台默认模型。
- 加密主密钥仍由部署环境统一提供，但每条自定义模型记录及密文按 `organizationId` 隔离。

### 5.7 API Key

`ApiKey` 增加 `organizationId @unique`，实现每家公司最多一条当前 Key 记录：

- 公司 Admin 管理本公司 Key。
- Super Admin 选择公司后可代管。
- Key 的 `createdBy` 只记录创建者和审计归属；Key 的有效性属于公司，不因创建者后来停用而自动失效。
- 公司停用、Key 过期或 Key 被删除时验证失败。
- External API 创建的所有数据必须写入 Key 所属公司。
- External API 的请求身份应包含 `organizationId`、`apiKeyId`、`createdBy`，不得把 Key 创建者的角色当作跨公司授权依据。

## 6. 认证与授权设计

### 6.1 JWT 与请求身份

JWT 可继续只保存身份提示字段，但授权不得信任 Token 中长期缓存的角色和公司信息。`JwtStrategy.validate` 应通过数据库加载：

- 当前用户是否存在且为 `active`。
- 当前角色。
- 当前 `organizationId`。
- 所属公司是否为 `active`。

建议的请求身份：

```ts
interface AuthUser {
  userId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  organizationId: string | null;
}
```

这样停用用户、停用公司和角色调整无需等待旧 Access Token 到期。角色或公司变化时还应删除该用户全部 Refresh Token。

### 6.2 公司上下文解析

增加统一的 `OrganizationContextGuard` 或等价请求上下文服务：

- Admin/User：公司上下文只能来自数据库中的 `user.organizationId`。
- Admin/User 如果提交不同的目标公司，返回 `403`。
- Super Admin：通过前端选中的公司 ID 指定目标上下文。
- 对需要具体公司的写操作，Super Admin 未选择公司时使用隐藏的 `platform_defaults` 作为业务数据归属。
- “全部公司”仅允许用于明确支持全局汇总的只读接口。
- `platform_defaults` 是隐藏的普通 `Organization`，仅用于让 Platform Defaults 模式下的合同数据继续走同一套租户隔离路径。公司列表和公司管理 UI 不展示它。

推荐统一使用 `X-Organization-Id` 请求头传递 Super Admin 的目标公司。该请求头只是目标选择，不是授权证明；后端必须先确认请求者是 Super Admin，并校验目标公司存在。

### 6.3 授权辅助层

不要在各 Service 中继续散落字符串角色判断。增加集中式访问上下文和 Prisma 条件构造器，例如：

```ts
interface AccessContext {
  actorId: string;
  role: Role;
  organizationId: string | null;
  selectedOrganizationId: string | null;
}

function ownedResourceWhere(ctx: AccessContext) {
  const organizationId = resolveRequiredOrganization(ctx);
  return ctx.role === 'user'
    ? { organizationId, userId: ctx.actorId }
    : { organizationId };
}
```

所有列表、详情、下载、反馈、分析执行、对比、模板和 Admin 接口都应使用该上下文。详情接口对越权 ID 建议统一返回 `404`，减少跨租户资源枚举信息。

### 6.4 角色路由保护

- `AdminRoute`：允许 `admin` 和 `super_admin`。
- 新增 `SuperAdminRoute` 或等价权限参数：仅允许 `super_admin`。
- 后端 `@Roles('admin')` 应按接口语义调整为：
  - 公司管理：仅 `super_admin`。
  - 公司级管理：`admin`、`super_admin`，同时要求公司上下文。
  - 平台默认配置：仅 `super_admin` 且处于平台上下文。

前端路由保护仅改善体验，安全控制必须全部由后端实施。

### 6.5 Entra SSO

关闭未知用户 JIT 创建：

1. 公司 Admin/Super Admin 先在 User Management 创建用户并指定公司。
2. 用户首次 Entra 登录时按已验证邮箱查找现有账号。
3. 找到后绑定 `entraOid` 并更新显示名称。
4. 未找到时拒绝登录，返回明确的“账号尚未开通”错误。
5. 已停用用户或所属公司已停用时拒绝登录。

本地账号和 Entra 账号继续共享全平台唯一邮箱约束。

## 7. 后端模块改造

### 7.1 新增组织模块

建议新增：

```text
apps/api/src/organizations/
  organizations.module.ts
  organizations.controller.ts
  organizations.service.ts
  dto/organizations.dto.ts
```

主要接口：

```http
GET    /admin/organizations
POST   /admin/organizations
GET    /admin/organizations/:id
PATCH  /admin/organizations/:id
PATCH  /admin/organizations/:id/status
```

全部仅限 Super Admin。创建接口应在一个数据库事务中完成公司创建和第一名 Admin 创建/指定。

### 7.2 用户管理接口

沿用 `/admin/users`，不新增前端页面：

```http
GET    /admin/users?organizationId=&role=&status=&q=
POST   /admin/users
PATCH  /admin/users/:id
PATCH  /admin/users/:id/status
PATCH  /admin/users/:id/role
PATCH  /admin/users/:id/organization
```

规则：

- Admin 的查询和写操作始终强制为自己的公司。
- Super Admin 可查询全部或指定公司。
- 只有 Super Admin 能调用组织迁移或 Super Admin 角色变更。
- 角色、公司和状态修改在事务中完成，并撤销目标用户 Refresh Token。
- 最后一名有效公司 Admin 的判断必须具备并发安全性：事务内锁定公司记录，再统计有效 Admin 并更新，避免两个并发请求同时移除最后两名 Admin。

### 7.3 现有业务服务

必须逐一改造：

- `DocumentsService`
- `AnalysisService`
- `CompareService`
- `HistoryService`
- `UsersService`
- `AdminDashboardService`
- `AuditService`
- `FieldTemplatesService`
- `PromptTemplatesService`
- `TemplateRequestsService`
- `NotificationsService`
- `ModelsService`
- `ApiKeyService`

每个数据库查询都要回答两个问题：

1. 该记录属于哪家公司？
2. 当前角色在这家公司内能访问到用户级还是公司级数据？

不得只改列表接口；详情、下载、反馈、对比引用的 Document、模板引用和异步 Job 更新同样必须验证公司边界。

### 7.4 Dashboard、History 和 Audit

- Admin：只查询本公司。
- Super Admin + 具体公司：查询目标公司。
- Super Admin + 全部公司：允许汇总或全量只读查询。
- User：不能访问 Admin 页面。

`AuditLog.organizationId` 表示操作影响的目标公司：

- 公司用户操作：其公司。
- Super Admin 操作公司数据：目标公司。
- Super Admin 平台操作：`null`。

公司 Admin 可以看到作用于本公司的 Super Admin 操作，但看不到其他公司或纯平台日志。审计日志必须保留实际 `userId`，不得伪装成目标公司用户。

### 7.5 文件存储

新上传的 Azure Blob 路径建议从：

```text
{userId}/{random}.{ext}
```

调整为：

```text
{organizationId}/{userId}/{random}.{ext}
```

数据库权限仍是唯一安全边界；Blob 路径分层用于运维、归档和降低误操作风险。已有文件无需物理搬迁，只需正确回填数据库的公司归属。

## 8. 前端设计

### 8.1 登录状态

扩展前端 `User` 类型：

```ts
interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
  organizationId: string | null;
  organization?: { id: string; name: string; status: 'active' | 'disabled' } | null;
}
```

应用启动时调用 `/auth/me` 重新确认身份，不应仅信任 Zustand 持久化缓存。收到 `401/403` 时清理或刷新相应状态。

### 8.2 Super Admin 公司上下文

- 顶部 Header 增加公司上下文选择器，仅 Super Admin 可见。
- 可选上下文：`全部公司`、`平台默认配置`、具体公司。
- 选择结果保存到独立 Zustand store；不得混入登录身份。
- API Client 对需要公司上下文的请求发送 `X-Organization-Id`。
- TanStack Query 的所有公司级缓存 Key 必须包含公司 ID，例如：

```ts
['admin-users', organizationId]
['admin-history', organizationId]
['admin-models', organizationId]
```

切换公司时取消或失效旧公司的相关查询，防止界面短暂显示上一公司的敏感数据。

### 8.3 User Management 页面

保持现有 `/admin/users` 路由，不新增独立页面。

Super Admin 看到两个页签：

1. 公司
   - 公司名称、状态、用户数、有效 Admin 数、创建时间。
   - 创建公司、编辑名称、停用/启用公司。
   - 无有效 Admin 的公司显示醒目警告和快速分配操作。
2. 用户
   - 支持公司、角色、状态和关键词筛选。
   - 显示公司列。
   - 创建用户、修改角色、停用/启用、调整公司。
   - Super Admin 与公司角色的转换使用明确确认框。

公司 Admin：

- 只显示本公司用户表格，不显示公司页签和公司筛选。
- 编辑弹窗中的角色选项仅包含 Admin/User，表格角色列保持只读展示和筛选。
- 最后一个 Admin 的角色或状态控件禁用，并由后端再次校验。
- 原“删除”按钮改为“停用/启用”。

### 8.4 其他 Admin 页面

- Dashboard：Admin 为本公司；Super Admin 可查看全部汇总或选定公司。
- All History：同上；详情和下载继续使用相同公司上下文。
- Audit：同上；公司视图包含 Super Admin 对该公司的操作。
- System Settings：Admin 自动使用本公司；Super Admin 在平台或具体公司上下文中使用。
- 公司上下文不适用于普通 User 页面；普通 User 永远使用自身公司且只能查看自己的数据。

### 8.5 System Settings

继续复用现有页面和页签：

- 字段模板。
- Prompt 模板。
- 模板审批请求。
- 模型。
- API Key。

公司上下文下仅展示和维护该公司的配置；平台上下文只展示平台默认模板和基础模型配置，不提供公司 API Key。

## 9. 存量数据迁移

迁移必须可重复验证，并在单独的数据库备份后执行。

### 9.1 迁移顺序

1. 新增枚举、Organization 表和所有新字段，租户字段先允许为空。
2. 创建一个默认迁移公司，例如 `Legacy Organization`。
3. 临时将所有现有用户关联到默认公司。
4. 在仍能通过用户关系识别归属时，回填所有业务表、审计、通知、请求、API Key 和自定义模型的 `organizationId`。
5. 迁移模板：
   - 通过名称和规范化内容同时匹配当前 seed，只有完全匹配的官方模板迁移为平台模板。
   - 重新由 seed 补齐缺少的官方平台默认模板。
   - 其他现有 `isSystem = true` 模板迁移为默认公司的公司模板，以免把客户自定义模板泄漏给未来公司。
   - 现有 `isSystem = false` 模板迁移为默认公司的个人模板。
   - 保留现有公司默认选择；不存在时回退平台默认。
6. 将现有模型目录设置复制为默认公司的模型设置。
7. 将现有自定义模型和唯一 API Key 归入默认公司。
8. 将所有原 `admin` 用户改为 `super_admin`，并清空其 `organizationId`。
9. 原 `user` 保持 `user` 并继续属于默认公司。
10. 对必填租户字段设置 `NOT NULL`，增加外键、索引、检查约束和唯一约束。
11. 运行迁移校验脚本，确认没有孤立数据或跨公司关联。
12. 默认公司可能暂时没有公司 Admin；User Management 必须显示“需要分配 Admin”警告，由 Super Admin 后续手动调整。正常业务操作不得再产生零 Admin 公司。

### 9.2 迁移校验

至少验证：

```text
所有非 Super Admin 用户都有 organization_id
所有 Super Admin 的 organization_id 都为空
所有 Document/AnalysisJob/CompareJob 都有 organization_id
AnalysisJob.organization_id = Document.organization_id
CompareJob 关联的全部 Document 属于同一 organization_id
所有个人/公司模板都有 organization_id
平台模板 organization_id 和 user_id 均为空
所有公司自定义模型和 API Key 都有 organization_id
不存在跨公司模板、文档或 Job 外键引用
```

迁移完成后撤销全部现有 Refresh Token，要求用户重新登录。

## 10. 安全要求

1. 所有租户边界必须在后端数据库查询中体现，不能依赖前端隐藏。
2. 普通用户提交的 `organizationId` 不得覆盖服务端身份中的公司。
3. Super Admin 必须明确选择目标公司才能执行公司级写操作。
4. 所有跨公司越权访问测试必须返回 `403` 或 `404`，且不得泄露记录是否存在。
5. 角色变更、公司变更、用户停用和公司停用立即撤销 Refresh Token，并由每请求数据库校验阻止旧 Access Token。
6. API Key 不继承创建者的 Super Admin 权限，只拥有所属公司的 External API 能力。
7. 公司自定义模型的 endpoint、密钥状态等管理字段不得出现在其他公司或普通模型目录响应中。
8. Super Admin 对公司数据的读取、下载和写操作必须记录目标公司和实际操作者。
9. 日志不得记录 JWT、Refresh Token、完整 API Key、模型密钥或合同正文。

## 11. 测试策略

### 11.1 单元测试

- 权限条件构造器的三角色矩阵。
- 公司上下文解析和伪造公司头拒绝。
- 最后一名 Admin 的保护。
- 模板作用域、默认值回退和公司审批。
- 公司模型覆盖、同名自定义模型隔离和默认模型解析。
- 公司/API Key 停用逻辑。
- Entra 未预创建账号拒绝及已存在账号绑定。

### 11.2 API 集成测试

准备两个公司 A/B，每家公司包含 Admin、User1、User2，再加一个 Super Admin。对下列资源进行正向和反向测试：

- 用户列表与角色/状态修改。
- 文档详情、文本、下载。
- 分析执行、详情、历史、反馈。
- 对比执行、详情、历史、反馈。
- 个人、公司、平台模板。
- 模板申请和审批。
- 模型目录、公司自定义模型和执行解析。
- API Key 创建、验证和 External API 数据归属。
- Dashboard、All History、Audit。

必须覆盖：

- A 的 User 无法访问 A 的其他 User 数据。
- A 的 Admin 可访问 A 的所有数据但无法访问 B。
- A 的 Admin 无法修改其他用户的业务记录或代替他人提交反馈。
- B 的 Admin 无法通过伪造 `X-Organization-Id` 访问 A。
- Super Admin 未选公司不能执行公司写操作。
- Super Admin 选 A 后不能用同一上下文读取 B 的资源 ID。
- 停用用户、停用公司、角色变更立即生效。
- 两个并发请求不能同时移除同一公司的最后两名 Admin。

### 11.3 前端测试

- 三角色菜单和路由可见性。
- Super Admin 公司上下文切换。
- Query Key 包含公司 ID，切换时不显示旧公司缓存。
- User Management 两种角色视图。
- 最后 Admin 的 UI 禁止及服务端错误提示。
- System Settings 的平台/公司上下文。
- 停用公司和账号后的登录错误。

### 11.4 迁移测试

- 使用生产结构的脱敏数据库副本执行迁移。
- 比较迁移前后各表记录数。
- 验证模板、模型、API Key 和历史记录仍可使用。
- 验证所有原 Admin 成为 Super Admin。
- 验证默认公司之外的新公司无法看到任何迁移数据。
- 验证回滚方案和数据库备份可恢复。

## 12. 验收标准

以下条件全部满足才可认为功能完成：

1. Super Admin 不属于公司，并可在一个 User Management 页面管理公司和全部用户。
2. 公司 Admin 只能管理本公司用户，且每家公司至少保留一名有效 Admin。
3. User 只能看到自己的合同、分析、对比、反馈和个人模板。
4. 公司 Admin 可以查看本公司仪表盘、全部历史、下载和审计，但无法访问其他公司。
5. 平台默认模板所有公司可见，公司模板和个人模板严格按作用域隔离。
6. 公司模板申请只由同公司 Admin 审批。
7. 每家公司独立配置模型、默认模型、自定义模型凭证和一把 API Key。
8. 公司 A 无法通过列表、详情 ID、下载、关联 ID、缓存或 External API 读取公司 B 数据。
9. 未预创建的 Entra 用户无法自动注册。
10. 用户和公司停用立即阻断登录、刷新和 API 请求，历史数据保留。
11. Super Admin 的公司级操作以真实身份写入该公司的审计日志。
12. 存量数据全部迁入默认公司，原 Admin 全部升级为 Super Admin，且没有孤立记录。
13. API、Web 的 typecheck、lint、test 和 build 全部通过。

## 13. 明确不应采用的实现方式

- 只给 User 增加 `organizationId`，通过关联用户临时推断所有数据归属。
- 继续让 `admin` 无条件绕过所有查询过滤。
- 仅在前端隐藏其他公司的数据。
- 接受普通 Admin 请求中任意传入的 `organizationId`。
- 把 Super Admin 建模成某家特殊公司的 Admin。
- 允许 Entra 未知用户 JIT 创建后再补公司。
- 为了迁移方便而把现有公司模板当成平台模板共享给未来公司。
- 删除用户时级联删除合同和历史记录。
- 让组织 API Key 继承创建者的 Super Admin 权限。
