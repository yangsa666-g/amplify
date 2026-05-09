# PRD
# Contract AI Review App - Product Requirements Document

- Version: v1.0
- Status: Draft
- Owner: Product / Engineering
- Last Updated: 2026-05-09

---

## 1. Overview

### 1.1 Product Name
Contract AI Review App

### 1.2 Product Vision
Build a web application that helps users upload contracts, extract structured information, perform AI-based contract risk analysis, and compare differences between two contract versions efficiently.

### 1.3 Background
Contract review and comparison are repetitive and time-consuming tasks for legal, commercial, procurement, and contract management teams. This product aims to improve efficiency and consistency by combining document parsing, AI-powered extraction, AI-powered review, and text diff comparison.

### 1.4 Goals
The system shall support:
1. Contract upload, text extraction, field extraction, and risk analysis
2. Two-version contract comparison with Git-style diff visualization
3. Local authentication and Microsoft Entra ID SSO
4. Configurable extraction fields and configurable risk analysis prompt
5. AI model selection from backend-configured supported models
6. History retention and result viewing

### 1.5 Non-Goals (MVP)
The following are not in scope for MVP:
- OCR for scanned image contracts
- Multi-step approval workflow
- Team collaboration comments
- Export to PDF/Excel
- Full audit center
- Semantic redline drafting suggestions
- Advanced RBAC beyond Admin/User

---

## 2. Users and Roles

### 2.1 Target Users
- Legal reviewers
- Contract managers
- Sales operations / commercial teams
- Procurement teams
- Internal business users handling contracts

### 2.2 Roles

#### Admin
Can:
- Manage system default field template
- Manage system default risk analysis prompt
- Manage users
- View system configuration
- Maintain model whitelist if admin UI is provided later

#### User
Can:
- Log in
- Upload contracts
- Run extraction and risk analysis
- Compare two contract versions
- Maintain personal field template
- Maintain personal risk prompt
- View own history and details
- Change own password (local account only)

---

## 3. Product Scope

### 3.1 Functional Modules
1. Authentication
2. Contract Extraction and Analysis
3. Contract Comparison
4. History
5. Settings / Configuration
6. Profile

---

## 4. Functional Requirements

---

## 4.1 Authentication

### 4.1.1 Local Login
The system shall support local authentication with email/username and password.

#### Acceptance Criteria
- User can log in with valid credentials
- Invalid credentials return an error
- Session/token-based login is established after successful authentication

### 4.1.2 Logout
The system shall support logout.

#### Acceptance Criteria
- Logged-in user can log out successfully
- Session/token is invalidated or removed on logout

### 4.1.3 Change Password
The system shall allow local users to change their password.

#### Acceptance Criteria
- User must provide old password
- New password must meet password policy
- Password update succeeds only if old password is correct
- Entra ID users do not use this feature for identity password change

### 4.1.4 Microsoft Entra ID SSO
The system shall support login via Microsoft Entra ID.

#### Acceptance Criteria
- User can authenticate via Entra ID
- If email matches an existing account, the account is linked
- If email does not exist, a new user account is created automatically
- Login provider is recorded as `entra`

---

## 4.2 Contract Extraction and Analysis

### 4.2.1 Contract Upload
The system shall allow users to upload a single contract file for extraction and analysis.

#### Supported File Types
- PDF
- DOCX
- DOC
- TXT

#### Acceptance Criteria
- User can select and upload one file
- Unsupported file types are rejected
- File size limit is enforced
- Upload status is shown to the user

### 4.2.2 Contract Text Extraction
The system shall extract text from uploaded contract files.

#### Acceptance Criteria
- Text extraction is triggered after upload or before analysis
- Extracted text is stored for subsequent analysis
- If extraction fails, the user sees a clear error message

### 4.2.3 Field Template Display and Management
The system shall display extraction fields and field descriptions and allow user-level management.

Each field shall contain:
- field
- field_description

Supported actions:
- view
- add
- edit
- delete
- save
- reset to default

#### Acceptance Criteria
- The user can see the current field template in table/list form
- The user can add a new field
- The user can edit field name and description
- The user can delete a field
- The user can save their own field template
- The user can reset to system default
- Admin can manage system default template

### 4.2.4 AI-Based Field Extraction
The system shall dynamically generate a prompt using the configured field list and the extracted contract text, and then send it to the AI Foundry API.

#### Acceptance Criteria
- Selected or current field template is transformed into prompt input
- Contract text is inserted into the prompt
- Chosen model is sent to AI Foundry API
- Extraction result is returned and displayed
- Result is saved by default

### 4.2.5 Risk Analysis Prompt Display and Management
The system shall provide a default risk analysis prompt, display it to the user, and allow user-level editing and saving.

#### Acceptance Criteria
- The default prompt is visible on the UI
- The user can edit and save a personal prompt
- The user can reset to system default prompt
- Admin can manage system default prompt
- System validates presence of required variable `{contract_text}`

### 4.2.6 AI-Based Risk Analysis
The system shall generate risk analysis based on the selected prompt template and extracted contract text.

#### Acceptance Criteria
- The selected risk prompt is used
- `{contract_text}` is replaced by extracted contract text
- Selected model is used
- The output is shown to the user
- Result is saved by default

### 4.2.7 Result Persistence
The system shall save every analysis run by default.

Saved content shall include:
- contract name
- upload time
- task type
- selected model
- prompt snapshot
- field template snapshot
- extraction result
- risk analysis result
- related document reference
- extracted text reference or stored content

#### Acceptance Criteria
- A successful run creates a history entry
- Result detail can be opened later
- Historical record reflects the actual prompt/template used at execution time

### 4.2.8 Recent History
The system shall allow the user to view the latest analysis results.

#### Acceptance Criteria
- The UI shows up to the most recent 10 records
- User can click a record to view details
- Detail page shows contract name, result, model, timestamps, snapshots

> Note: For MVP, UI must display latest 10 records. Backend persistence strategy may retain all data unless product decides to hard-delete older ones.

---

## 4.3 Contract Comparison

### 4.3.1 Two-File Upload
The system shall allow users to upload two contract files:
- old version
- new version

#### Acceptance Criteria
- User can upload one old file and one new file
- Unsupported types are rejected
- Upload status is shown

### 4.3.2 Text Extraction for Comparison
The system shall extract text from both uploaded files.

#### Acceptance Criteria
- Text extraction is performed for both files
- If one extraction fails, comparison fails with proper error message

### 4.3.3 Contract Diff
The system shall compare the two extracted contract texts and display differences.

#### Acceptance Criteria
- Added content is highlighted
- Removed content is highlighted
- Modified sections are represented through diff blocks
- Comparison supports Git-style display

### 4.3.4 Diff View Modes
The system should support:
- side-by-side diff
- unified diff

#### Acceptance Criteria
- User can switch view mode if both are provided
- Default view mode is side-by-side

### 4.3.5 Comparison Result Persistence
The system should save comparison results.

#### Acceptance Criteria
- Each successful comparison creates a history entry
- User can reopen a prior comparison result

---

## 4.4 Model Selection

### 4.4.1 Supported AI Models
The system shall allow users to choose from AI models supported by AI Foundry.

Default supported models:
- gpt-5.4
- gpt-5.4-mini

#### Acceptance Criteria
- Frontend fetches model list from backend
- Backend reads supported models from environment variables
- Frontend does not hardcode model list
- User can select a model before running extraction/analysis

---

## 4.5 Profile and Settings

### 4.5.1 Profile
The system shall display current user profile information.

#### Acceptance Criteria
- User can see email/name
- User can see login provider
- Local users can access change password
- Entra ID users can still log out

### 4.5.2 Settings
The system shall provide settings for:
- personal field template
- personal risk prompt
- model list display

Admin settings shall additionally support:
- system default field template
- system default prompt

---

## 5. User Experience Requirements

### 5.1 Main Navigation
The application shall use a left sidebar navigation.

Recommended menu:
1. Contract Analysis
2. Contract Compare
3. History
4. Settings
5. Profile

### 5.2 Contract Analysis Page
The page should include:
- file upload area
- model selection
- run action
- fields configuration area
- prompt configuration area
- extraction result display
- risk analysis result display
- recent history list

### 5.3 Contract Compare Page
The page should include:
- upload old version
- upload new version
- compare action
- diff mode selection
- diff result viewer

### 5.4 History Page
The page should include:
- recent analysis history
- recent comparison history
- clickable records for detail view

### 5.5 Feedback and Status
The system shall provide:
- loading indicators
- success/failure notifications
- meaningful error messages
- disabled action states while processing

---

## 6. Business Rules

1. Users can only access their own uploaded files, analysis results, and comparison results unless otherwise explicitly allowed.
2. Default model list is controlled by backend configuration.
3. Prompt snapshots and field template snapshots must be stored with each analysis result.
4. Risk prompt must contain `{contract_text}` to be valid.
5. Field extraction must use the exact configured field list at run time.
6. If no relevant field information is found in the contract, the system should preserve null/not-found values returned by AI.
7. The compare feature should use extracted text and show textual differences rather than legal interpretation in MVP.
8. User-level field and prompt configuration overrides system default for that user.
9. If user-level configuration does not exist, fallback to system default.

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Typical upload and analysis should complete within acceptable interactive time, target 10–30 seconds depending on file size and model response
- Contract comparison should complete within a few seconds for standard-size text contracts

### 7.2 Security
- Passwords must be securely hashed
- JWT/session must be protected
- File upload must validate type and size
- User data isolation must be enforced
- Secrets must be stored in environment variables

### 7.3 Reliability
- AI/API errors should be handled gracefully
- Parsing failures should be visible to the user
- Retry support may be added later

### 7.4 Scalability
- System should support future expansion for OCR, more models, and more prompt templates
- Architecture should support asynchronous jobs in later phases

### 7.5 Maintainability
- Use modular frontend/backend design
- Use monorepo for shared types and unified development workflow

---

## 8. Data Requirements

### 8.1 Core Data Entities
- User
- Field Template
- Field Template Item
- Prompt Template
- Document
- Analysis Job
- Field Extraction Result
- Risk Analysis Result
- Compare Job

### 8.2 Historical Traceability
Each analysis result must preserve:
- document reference
- model used
- field template snapshot
- prompt snapshot
- execution timestamp
- result payload

---

## 9. Acceptance Scope Summary

MVP shall be considered complete when:
1. Local login/logout/change password works
2. Entra ID login works
3. User can upload a contract and extract text
4. User can manage personal extraction fields
5. User can view and edit personal risk prompt
6. User can select a backend-provided AI model
7. User can run field extraction and risk analysis
8. Result is displayed and saved
9. User can view latest 10 results
10. User can upload two contracts and compare differences with Git-style diff

---

## 10. Risks and Open Questions

### 10.1 CSV Encoding Risk
The provided `CTS_fields.csv` appears to have encoding/garbled text issues. The original source file should be converted to UTF-8 before being used as the system default field template.

### 10.2 OCR Scope
Scanned image contracts may fail text extraction in MVP. OCR support should be explicitly scheduled if needed.

### 10.3 Long Contract Token Limits
Very long contracts may exceed model context or reduce response quality. Future chunking strategies may be required.

### 10.4 History Retention Clarification
Open question:
- Should backend persist all results and UI only show latest 10?
- Or should system hard-limit storage to latest 10 per user?

Recommended MVP decision:
- Persist all results, display latest 10 in UI.

### 10.5 Admin Data Visibility
Open question:
- Should Admin be able to view all user contract content and results?
Recommended MVP:
- No, Admin manages configuration and users only, without default access to contract content.

---

## 11. Future Enhancements

- OCR support for scanned contracts
- AI-generated summary of contract differences
- Export analysis results
- Shared templates by team
- Advanced RBAC
- Audit logs
- Search and filter in history
- More review prompt templates