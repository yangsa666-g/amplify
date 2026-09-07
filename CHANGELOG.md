# Changelog

## 0.6.0 (unreleased)

### Features

* add organization-level access control with Super Admin, Organization Admin, and Organization User roles
* scope documents, analysis, compare jobs, history, audit, templates, models, and API keys by organization
* add Super Admin organization context switching and organization management inside User Management
* allow Super Admin to run business workflows directly from `Platform Defaults`

### Migration Notes

* creates `legacy_organization` and assigns existing tenant data to it
* creates hidden `platform_defaults` storage for Super Admin business workflows in Platform Defaults
* converts existing Admin users to `super_admin`
* revokes refresh tokens so role and organization changes take effect immediately

## [0.5.2](https://github.com/shidafu666/amplify/compare/v0.5.1...v0.5.2) (2026-08-27)


### Bug Fixes

* **database:** normalize Azure PostgreSQL private link hosts ([#60](https://github.com/shidafu666/amplify/issues/60)) ([a36cb04](https://github.com/shidafu666/amplify/commit/a36cb04b89a64004611b14c7ef4c2dcb23bac69a))

## [0.5.1](https://github.com/shidafu666/amplify/compare/v0.5.0...v0.5.1) (2026-08-24)


### Bug Fixes

* **models:** clarify custom model identifier label ([#58](https://github.com/shidafu666/amplify/issues/58)) ([e6ca494](https://github.com/shidafu666/amplify/commit/e6ca4949b067b7ae105633ae8fc99b74fc5b72e6))

## [0.5.0](https://github.com/shidafu666/amplify/compare/v0.4.1...v0.5.0) (2026-08-24)


### Features

* **compare:** add AI multi-contract analysis ([#53](https://github.com/shidafu666/amplify/issues/53)) ([6bb0690](https://github.com/shidafu666/amplify/commit/6bb0690f8b0420cd966b093b3604bfb95649d033))
* **models:** add provider icons for custom models ([#57](https://github.com/shidafu666/amplify/issues/57)) ([43fb39a](https://github.com/shidafu666/amplify/commit/43fb39a849da3e29c5c13a9ab8d8363b9bdbe92c))


### Bug Fixes

* **config:** accept longer model credential key material ([#56](https://github.com/shidafu666/amplify/issues/56)) ([8165e6a](https://github.com/shidafu666/amplify/commit/8165e6a38a89c3546a899f39b9979c308b0326c7))

## [0.4.1](https://github.com/shidafu666/amplify/compare/v0.4.0...v0.4.1) (2026-06-12)


### Bug Fixes

* extend analysis request timeouts ([97ba49a](https://github.com/shidafu666/amplify/commit/97ba49aff48144d1f68b6b7487f8f54466f32bfe))

## [0.4.0](https://github.com/shidafu666/amplify/compare/v0.3.0...v0.4.0) (2026-06-09)


### Features

* **web:** redesign admin dashboard ([248f64f](https://github.com/shidafu666/amplify/commit/248f64f61700c6d80e40edee3be90c2f1726a74b))

## [0.3.0](https://github.com/shidafu666/amplify/compare/v0.2.0...v0.3.0) (2026-06-08)


### Features

* add admin audit logs ([39c62b6](https://github.com/shidafu666/amplify/commit/39c62b6a0b6c075b819f448ccd98d9af88232d75))

## [0.2.0](https://github.com/shidafu666/amplify/compare/v0.1.0...v0.2.0) (2026-06-08)


### Features

* **web:** add PWA install support ([68b442b](https://github.com/shidafu666/amplify/commit/68b442b6f03933f9775cc02f026337a2fd8a2f43))

## 0.1.0 (2026-06-08)


### Features

* API hardening + input validation, CI, web code-splitting & analysis UX ([812e27c](https://github.com/shidafu666/amplify/commit/812e27c14629d0e9ff4d3b52a3bf9bbf8138a522))
* **auth:** add Microsoft Entra ID SSO alongside local login ([cdf683f](https://github.com/shidafu666/amplify/commit/cdf683f440a4ae51220792a25784e54789d856c2))
* **auth:** relabel SSO button to "SSO with Entra ID" with Microsoft logo ([900bff9](https://github.com/shidafu666/amplify/commit/900bff91b7bceb282c491d4d2153c2dff0b52be2))
* record and display run timings (OCR, field extraction, risk analysis) ([4ae6645](https://github.com/shidafu666/amplify/commit/4ae6645b32d46e657367598ff85b889c2c0048a2))
* **web:** add Amplify logo (chevron mark) + animated login background ([9cfe7d1](https://github.com/shidafu666/amplify/commit/9cfe7d10e334edc73a464193a97fabd264d11e3e))
* **web:** add dev mock mode ([#32](https://github.com/shidafu666/amplify/issues/32)) ([fac80f5](https://github.com/shidafu666/amplify/commit/fac80f58377b54d40caafc32e1675d48b79b3466))
* **web:** add i18n (zh/en), dark mode, and mobile responsive UI ([9c90b09](https://github.com/shidafu666/amplify/commit/9c90b09e75e69b1e39de098f6e4e94cd51c48887))
* **web:** always-visible scrollbars on analysis result panes ([9e57dbe](https://github.com/shidafu666/amplify/commit/9e57dbe115bdf3c79defbb46f34ec352fa4ef1cb))
* **web:** build complete Vite + React frontend for Contract AI Review ([3849780](https://github.com/shidafu666/amplify/commit/3849780d9061f103098adc6124be437c7433be24))
* **web:** full-screen Analysis Details with wrapping field table ([afe9222](https://github.com/shidafu666/amplify/commit/afe9222adb5b0f2d0244f06154cae964991e51b1))
* **web:** improve analysis detail header layout ([#31](https://github.com/shidafu666/amplify/issues/31)) ([40847b8](https://github.com/shidafu666/amplify/commit/40847b8299a43a4bebf221736cf7ec873124e57a))
* **web:** make compare history rows clickable to view diff detail ([d0bdacf](https://github.com/shidafu666/amplify/commit/d0bdacf0d0c8d8adc54c889c82c2142bcfae2d00))
* **web:** make Comparison Detail drawer full-screen ([#30](https://github.com/shidafu666/amplify/issues/30)) ([2f447c6](https://github.com/shidafu666/amplify/commit/2f447c67a902a2d1a7bfba4acc4a50cf3a51780d))
* **web:** persist contract compare page state across navigation ([ec14f97](https://github.com/shidafu666/amplify/commit/ec14f97d748e5346a20d78b068204d7877bca5aa))
* **web:** show upload + OCR progress in contract comparison ([710d41e](https://github.com/shidafu666/amplify/commit/710d41e4d904555ad215fd7cdc5228e858f5210b))
* **web:** show upload + OCR progress in the contract upload step ([66a080a](https://github.com/shidafu666/amplify/commit/66a080a1de7d1769be8aa98826cf0a1da6f797ab))
* **web:** surface analysis result ID for feedback lookup ([784f1eb](https://github.com/shidafu666/amplify/commit/784f1eb2d5d8070ff8207ddfbc96fa407609edcf))
* **web:** sync history detail selection to URL query ([#29](https://github.com/shidafu666/amplify/issues/29)) ([331019b](https://github.com/shidafu666/amplify/commit/331019bc4c528ad5ee32aa6c6fd62e2afe63691f))


### Bug Fixes

* **api:** decode non-English upload filenames (UTF-8) ([05286cc](https://github.com/shidafu666/amplify/commit/05286cc4ae1b25f5e3dfd904ca7f7c91f5758460))
* **api:** let admins view other users' analysis detail in All History ([6b51f0c](https://github.com/shidafu666/amplify/commit/6b51f0c4381a026092cc0a075e369601b5e03623))
* **api:** switch Anthropic thinking to adaptive + output_config.effort ([1079744](https://github.com/shidafu666/amplify/commit/1079744a5911181313ee4be2ba13546348b3b143))
* **auth:** stop SSO redirecting to localhost in deployed environments ([0391283](https://github.com/shidafu666/amplify/commit/039128315e59d780317e7b14b198781bc6e05e61))
* **lint:** resolve all ESLint errors and warnings across web app ([7f4044a](https://github.com/shidafu666/amplify/commit/7f4044a58761c32f195fda23a8b55b8414cda282))
* **makefile:** drop git fsmonitor socket before az acr build ([9a38b44](https://github.com/shidafu666/amplify/commit/9a38b44b980af5099d4091dd2d208de632676d65))
* scope "My History" to current user, split admin all-history endpoint ([2d72b19](https://github.com/shidafu666/amplify/commit/2d72b19d3ea92165e14de0d8778754385c985c4e))
