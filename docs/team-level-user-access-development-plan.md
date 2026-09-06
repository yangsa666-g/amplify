# 公司级用户访问控制开发计划

## 1. 执行原则

本计划与 [team-level-user-access-technical-design.md](./team-level-user-access-technical-design.md) 配套使用。开发 AI 必须先完整阅读技术设计，再按阶段实施。

实施要求：

- 每个阶段保持可编译、可测试。
- 优先建立后端租户边界，再开放前端入口。
- 所有数据查询改造必须同时覆盖列表、详情、下载、关联资源和写操作。
- 不使用前端过滤代替后端授权。
- 不硬删除现有用户或公司。
- 不顺带重构与本功能无关的模块。

## 2. 阶段总览

| 阶段 | 目标 | 主要产物 |
|---|---|---|
| 0 | 建立基线 | 测试数据、现状测试、迁移备份说明 |
| 1 | 数据模型与迁移 | Organization、角色、租户字段、存量回填 |
| 2 | 身份与授权基础设施 | 实时身份校验、公司上下文、统一访问条件 |
| 3 | 公司和用户管理 | 公司 CRUD/停用、三角色管理、最后 Admin 保护 |
| 4 | 核心业务数据隔离 | 文档、分析、对比、历史、反馈、文件下载 |
| 5 | 模板租户化 | 平台/公司/个人模板及公司审批 |
| 6 | 模型与 API Key 租户化 | 公司模型覆盖、自定义模型、公司 API Key |
| 7 | Dashboard 与 Audit | 公司/平台统计、公司审计、SA 操作记录 |
| 8 | 前端权限与上下文 | User Management、公司选择器、所有管理页面 |
| 9 | 安全回归与发布 | 跨租户测试、迁移演练、构建和发布检查 |

## 3. 阶段 0：基线与测试夹具

### 任务

- [ ] 运行并记录当前 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 结果。
- [ ] 为权限测试建立固定夹具：公司 A/B、各自 Admin/User1/User2、Super Admin。
- [ ] 记录当前主要接口的响应形状，避免前端升级期间无意破坏。
- [ ] 准备可重复执行的脱敏数据库迁移样本。
- [ ] 记录迁移前各业务表数量和关键关联数量。

### 完成标准

- 存在可复用的权限测试工厂。
- 已区分本功能引入的问题与改造前已有问题。

## 4. 阶段 1：Prisma 模型与数据库迁移

### 主要文件

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/<timestamp>_add_organization_access/migration.sql`
- `apps/api/prisma/seed.ts`

### 任务

- [ ] 扩展 `Role`：增加 `super_admin`。
- [ ] 新增 `OrganizationStatus`、`TemplateScope`。
- [ ] 新增 `Organization`。
- [ ] 为 User 增加可空 `organizationId` 和关系/索引。
- [ ] 为 Document、AnalysisJob、CompareJob 增加 `organizationId`。
- [ ] 为模板、模板请求、通知、审计、自定义模型和 API Key 增加所需公司字段。
- [ ] 新增 `OrganizationModelSetting`。
- [ ] 把自定义模型唯一约束改为 `[organizationId, name]`。
- [ ] 把 API Key 约束改为每家公司最多一条。
- [ ] 增加角色/公司组合的数据库 CHECK constraint。
- [ ] 增加默认模板和默认模型所需的 partial unique indexes。
- [ ] 更新 seed，使官方模板以 `platform` scope 创建且可幂等执行。

### 迁移实现顺序

- [ ] 先以 nullable 字段部署结构。
- [ ] 创建默认迁移公司。
- [ ] 临时把所有用户关联到默认公司。
- [ ] 回填所有用户拥有或创建的数据。
- [ ] 通过名称与规范化内容识别完全匹配的官方模板并迁移为平台模板；其余现有系统模板迁入默认公司，再由 seed 补齐缺失的官方模板。
- [ ] 把现有模型设置、自定义模型和 API Key 迁入默认公司。
- [ ] 将原 Admin 改为 Super Admin 并清空公司字段。
- [ ] 设置 NOT NULL、外键、索引和约束。
- [ ] 撤销全部 Refresh Token。
- [ ] 输出迁移后完整性校验结果。

### 完成标准

- 所有租户业务数据都有公司归属。
- 原 Admin 全部为 Super Admin，原 User 位于默认公司。
- 新建空公司看不到默认公司的任何数据。
- 迁移可在数据库副本上稳定完成。

## 5. 阶段 2：身份、公司上下文和授权基础设施

### 主要文件

- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/decorators/current-user.decorator.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- `apps/api/src/auth/guards/api-key.guard.ts`
- 新增公司上下文 Guard/Decorator/Service

### 任务

- [ ] 扩展 `AuthUser`，包含数据库实时角色和公司归属。
- [ ] JwtStrategy 每次请求读取用户、状态和公司状态。
- [ ] 停用用户或停用公司返回 `401/403`。
- [ ] 角色/公司/状态变化时撤销 Refresh Token。
- [ ] 实现 Super Admin 的 `X-Organization-Id` 上下文解析。
- [ ] Admin/User 伪造其他公司头时拒绝请求。
- [ ] 实现 `AccessContext` 和统一 Prisma where 构造器。
- [ ] 调整 RolesGuard，支持 `super_admin` 和公司上下文要求。
- [ ] API Key Guard 返回公司主体，不继承创建者的跨公司权限。
- [ ] 修改 Entra 流程，禁止未知用户 JIT 创建，只允许预创建账号绑定。

### 测试

- [ ] 三角色 Guard 矩阵。
- [ ] 停用立即生效。
- [ ] 伪造公司上下文拒绝。
- [ ] Entra 未预创建账号拒绝、预创建账号绑定成功。
- [ ] API Key 公司停用后失效。

### 完成标准

- 后续业务模块无需自行解释角色字符串，只消费统一访问上下文。

## 6. 阶段 3：公司和用户管理 API

### 主要文件

- 新增 `apps/api/src/organizations/*`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/users/dto/users.dto.ts`
- `apps/api/src/app.module.ts`

### 任务

- [ ] 实现 Super Admin 的公司列表、详情、创建、改名、停用/启用接口。
- [ ] 创建公司与第一名 Admin 在同一事务完成。
- [ ] 支持创建本地账号和 Entra 预创建账号。
- [ ] 用户列表支持公司、角色、状态、关键词过滤。
- [ ] Admin 查询始终限制为本公司。
- [ ] 实现 Admin/User 角色互转。
- [ ] 实现仅 Super Admin 可执行的 Super Admin 转换和公司调整。
- [ ] 把删除用户改为停用；移除或废弃硬删除接口。
- [ ] 使用事务和公司行锁实现最后一名有效 Admin 保护。
- [ ] 公司停用不改变用户/数据，只阻断访问。
- [ ] 所有管理操作写入 AuditLog。

### 测试

- [ ] Admin 无法枚举其他公司用户。
- [ ] Admin 无法管理 Super Admin。
- [ ] Admin 无法修改用户公司或提升 Super Admin。
- [ ] 最后一名有效 Admin 无法被降级/停用。
- [ ] 并发移除 Admin 不会留下零 Admin。
- [ ] Super Admin 角色转换正确设置/清空 organizationId。

## 7. 阶段 4：业务数据公司隔离

### 主要文件

- `apps/api/src/documents/*`
- `apps/api/src/analysis/*`
- `apps/api/src/compare/*`
- `apps/api/src/history/*`
- `apps/api/src/common/blob-storage.ts`

### 任务

- [ ] 文档上传时写入 `organizationId`。
- [ ] 新 Blob 路径增加 `organizationId/userId` 前缀。
- [ ] 文档详情、文本和下载应用统一访问条件。
- [ ] 分析运行验证 Document 与模板属于同一可访问公司。
- [ ] AnalysisJob 创建时写入公司快照。
- [ ] 分析详情、Recent、反馈查询按角色和公司过滤。
- [ ] 公司 Admin 对其他用户业务数据仅可查看/下载，不能修改记录或代为提交反馈。
- [ ] 对比运行只允许同一公司的 Document。
- [ ] CompareJob 创建时写入公司快照。
- [ ] 对比详情、Recent、反馈按角色和公司过滤。
- [ ] History 的本人、本公司和全平台模式正确区分。
- [ ] Super Admin 对租户业务数据操作需要明确公司上下文。

### 测试

- [ ] 针对每个资源进行跨公司 ID 猜测测试。
- [ ] User 无法读取同公司其他 User 数据。
- [ ] Admin 可读取本公司其他 User 数据。
- [ ] Admin 无法下载其他公司文件。
- [ ] 不允许跨公司文档对比。
- [ ] 反馈读取和提交遵守角色边界。

## 8. 阶段 5：模板租户化

### 主要文件

- `apps/api/src/field-templates/*`
- `apps/api/src/prompt-templates/*`
- `apps/api/src/template-requests/*`
- `apps/api/src/notifications/*`

### 任务

- [ ] 模板 CRUD 改用 `platform/organization/personal` scope。
- [ ] 用户模板列表返回平台 + 本公司 + 本人模板。
- [ ] 公司 Admin 只能维护本公司模板。
- [ ] Super Admin 平台上下文维护平台模板。
- [ ] Super Admin 公司上下文维护目标公司模板。
- [ ] 默认模板解析实现“公司优先、平台回退”。
- [ ] 模板请求写入申请人公司。
- [ ] 请求只通知同公司有效 Admin。
- [ ] 审批者必须是同公司 Admin 或目标公司上下文的 Super Admin。
- [ ] 批准后创建公司模板。
- [ ] 保证同公司/同类型最多一个默认模板。

### 测试

- [ ] A 公司看不到 B 公司模板和申请。
- [ ] 个人模板仍仅创建者可见。
- [ ] 公司默认覆盖平台默认。
- [ ] 公司未设置默认时正常回退平台默认。
- [ ] 平台模板不能被公司 Admin 修改。

## 9. 阶段 6：模型与 API Key 租户化

### 主要文件

- `apps/api/src/models/*`
- `apps/api/src/admin/api-keys/*`
- `apps/api/src/external-api/*`

### 任务

- [ ] 平台模型目录与公司覆盖配置分离。
- [ ] 模型列表根据公司合并平台模型、公司覆盖和公司自定义模型。
- [ ] 公司 Admin 可设置启用、排序、默认模型和默认推理强度。
- [ ] 自定义模型 CRUD 强制公司范围。
- [ ] 模型解析使用 `[organizationId, modelName]`。
- [ ] 允许不同公司使用相同自定义模型名称。
- [ ] 测试连接接口不得读取其他公司的凭证。
- [ ] API Key CRUD 改为公司范围、每公司一把。
- [ ] External API 上传、分析、对比全部写入 Key 所属公司。
- [ ] 公司停用后 Key 立即无效。

### 测试

- [ ] A/B 模型列表和自定义凭证完全隔离。
- [ ] 同名自定义模型分别解析到各公司的 endpoint。
- [ ] 默认模型按公司独立生效。
- [ ] A 的 Key 无法读取 B 的 Job ID。
- [ ] Key 不因创建者是 Super Admin 获得全平台权限。

## 10. 阶段 7：Dashboard、History 与 Audit

### 主要文件

- `apps/api/src/admin/admin-dashboard.*`
- `apps/api/src/history/*`
- `apps/api/src/audit/*`

### 任务

- [ ] Dashboard 查询支持公司范围和 Super Admin 全平台汇总。
- [ ] New Users、Active Users、Top Users、模型用量等全部按公司正确过滤。
- [ ] All History 支持 Admin 本公司、Super Admin 全部或指定公司。
- [ ] Audit 写入目标 `organizationId`。
- [ ] 公司 Admin 可看到作用于本公司的 Super Admin 操作。
- [ ] 平台日志只允许 Super Admin 查看。
- [ ] Audit 搜索和 action 聚合遵守相同公司过滤。
- [ ] 全局审计清理仍由 Super Admin 执行；公司 Admin 只读保留期设置。

### 测试

- [ ] 公司统计不包含其他公司数据。
- [ ] Super Admin 全部汇总与分公司数据求和一致。
- [ ] 公司 Audit 不泄漏其他公司用户姓名、邮箱或路径信息。

## 11. 阶段 8：前端权限和公司上下文

### 主要文件

- `apps/web/src/types/index.ts`
- `apps/web/src/stores/authStore.ts`
- 新增公司上下文 store
- `apps/web/src/api/client.ts`
- `apps/web/src/components/AdminRoute.tsx`
- 新增 Super Admin 路由保护
- `apps/web/src/layouts/AppLayout.tsx`
- `apps/web/src/pages/AdminUsersPage.tsx`
- `apps/web/src/pages/AdminDashboardPage.tsx`
- `apps/web/src/pages/AdminHistoryPage.tsx`
- `apps/web/src/pages/AdminAuditPage.tsx`
- `apps/web/src/pages/AdminSystemSettingsPage.tsx`
- 中英文 i18n 文件和 mocks

### 任务

- [ ] 扩展 User 类型和登录响应。
- [ ] 应用初始化调用 `/auth/me` 校验持久化会话。
- [ ] AdminRoute 允许 Admin/Super Admin；公司管理能力仅 Super Admin 可见。
- [ ] Header 为 Super Admin 增加公司上下文选择器。
- [ ] API Client 在需要时发送 `X-Organization-Id`。
- [ ] Query Key 全部加入公司上下文，并在切换时清理敏感缓存。
- [ ] User Management 增加“公司/用户”页签，但保持 `/admin/users` 路由。
- [ ] 公司 Admin 只显示本公司用户视图。
- [ ] 原删除交互改为停用/启用。
- [ ] 增加创建公司 + 第一名 Admin 流程。
- [ ] Dashboard 支持 Super Admin 全部/指定公司。
- [ ] History、Audit、System Settings 响应上下文切换。
- [ ] 平台默认模板显示只读/可编辑权限正确。
- [ ] 更新英文、中文文案、MSW fixtures 和 handlers。

### 完成标准

- 切换公司时不闪现旧公司数据。
- 页面按钮权限与后端一致，但后端仍能独立拒绝越权请求。
- 移动端布局仍可使用公司选择器和用户管理表格。

## 12. 阶段 9：安全回归、迁移演练与发布

### 自动化检查

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Prisma schema validate/generate。
- [ ] 迁移在空数据库执行成功。
- [ ] 迁移在脱敏存量数据库执行成功。

### 安全检查

- [ ] 对所有资源进行公司 A/B 的列表、详情、下载和关联 ID 越权测试。
- [ ] 检查所有 Prisma 查询是否包含集中式租户条件或有明确平台级原因。
- [ ] 检查前端 Query Key 是否包含公司上下文。
- [ ] 检查日志和 API 响应不泄露合同正文、Token、API Key 或模型密钥。
- [ ] 检查停用和角色变更对现有 Access/Refresh Token 的影响。
- [ ] 检查 API Key 不继承创建者角色。

### 发布步骤

1. 备份生产数据库并验证恢复流程。
2. 在 staging 使用生产脱敏副本执行完整迁移。
3. 部署兼容新 schema 的 API 与 Web。
4. 执行迁移与 seed。
5. 验证默认公司、存量用户、模板、模型、API Key 和历史记录。
6. 登录 Super Admin，在 User Management 为默认公司分配至少一名 Admin。
7. 进行公司 A/B 冒烟和越权测试。
8. 开放用户访问并监控 401/403、数据库错误和审计写入。

### 回滚要求

- 数据库结构迁移前必须有可恢复备份。
- 由于角色和租户字段发生语义变化，不应依赖简单 down migration 恢复生产。
- 如验证失败，应停止流量并恢复数据库备份和上一版本应用。

## 13. 开发 AI 的完成报告要求

开发完成后必须报告：

- 实际修改的文件清单。
- Prisma schema 与迁移的关键决策。
- 每个角色的数据访问矩阵验证结果。
- 存量迁移校验结果和记录数量对比。
- 执行过的 typecheck、lint、test、build 命令及结果。
- 任何未完成项、兼容性风险或需要人工部署的步骤。
- 不得仅以“页面不可见”作为权限功能完成的证据。
