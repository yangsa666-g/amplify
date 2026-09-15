# Security Policy

## Supported Versions

Amplify is currently pre-1.0 and is developed on a single rolling `main` branch. Security fixes are provided only for the latest released version.

| Version        | Supported          |
| -------------- | ------------------- |
| Latest release | :white_check_mark: |
| Older releases | :x:                 |

## Reporting a Vulnerability

We take the security of Amplify seriously. If you discover a security vulnerability, please **do not** open a public GitHub issue or discuss it in a public forum.

Instead, please report it privately using one of the following methods:

1. **GitHub Private Vulnerability Reporting (preferred)**
   Go to the [Security tab](https://github.com/yangsa666-g/amplify/security) of this repository and click **"Report a vulnerability"** to open a private advisory. This allows us to discuss and coordinate a fix with you before public disclosure.

2. **Email**
   If you are unable to use GitHub's private reporting, contact the maintainer directly at the email address listed on the [maintainer's GitHub profile](https://github.com/yangsa666-g).

Please include as much of the following information as possible to help us triage your report quickly:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue (proof-of-concept code, requests, or screenshots are helpful)
- The affected component (e.g., `apps/api`, `apps/web`, a specific package) and version/commit
- Any known mitigations or workarounds

### What to Expect

- **Acknowledgement:** We aim to acknowledge new reports within 3 business days.
- **Assessment:** We will investigate and validate the report, and keep you updated on progress at least every 7 days.
- **Fix & Disclosure:** Once a fix is available, we will coordinate a release and disclosure timeline with you. We ask that you keep the vulnerability confidential until a fix has been released.
- **Credit:** With your permission, we are happy to credit you for the discovery in the release notes or security advisory.

## Scope

This policy covers the code in this repository, including:

- The NestJS backend (`apps/api`)
- The React frontend (`apps/web`)
- Shared packages (`packages/`)
- Deployment configuration (`Dockerfile.azure`, `Dockerfile.Azure.China`, `deploy/`, `docker-compose.yml`)

Vulnerabilities in third-party dependencies should ideally be reported upstream as well, but you are welcome to notify us so we can track and update the dependency here.

## Preferred Languages

We prefer all communications to be in English or Chinese (中文).
