# Prompt Manager — User Guide

This guide explains how to use the Prompt Manager website from an end-user perspective.

## Table of contents

- Overview
- Logging in and out
- Prompt library (list/search/filter)
- Creating a new prompt
- Viewing prompt details
- Creating a new version
- Editing prompt metadata
- Publishing a prompt version to an environment
- Comparing versions
- Import / export
- Render preview (variables)
- Common issues / troubleshooting

## Overview

Prompt Manager is a lightweight system for creating, versioning, and publishing prompts.

Key concepts:

- **Prompt**: The logical “container” for a prompt over time (name/description/tags/status).
- **Version**: An immutable snapshot of the prompt text plus model settings and variables.
- **Environment**: A label (typically `dev`, `stage`, `prod`) that points to an “active” published version.
- **Publish**: Selecting a specific version to become active in an environment.

Navigation:

- **Login**: `/login`
- **Prompt list**: `/prompts`
- **Create prompt**: `/prompts/new`
- **Prompt detail**: `/prompts/:promptId`
- **Create version**: `/prompts/:promptId/versions/new?from=<versionId>`
- **Compare versions**: `/prompts/:promptId/compare`
- **Import/Export**: `/import-export`

## Logging in and out

### Logging in

1. Go to the login page: `/login`.
2. Enter your email and password.
3. Click **Login**.

What happens on success:

- You are redirected to the prompt library.
- The application stores an authentication token in your browser (used for write operations).

If you see **“Login failed”**:

- Verify you are using the correct credentials.
- See troubleshooting (CORS / API URL / token issues).

### Logging out

If the UI provides a **Logout** action, use it.

If there is no visible logout button, you can log out by clearing the stored token:

- Open your browser DevTools
- Go to **Application** -> **Local Storage**
- Remove the key `pm_token`

Then refresh the page.

## Prompt library (list/search/filter)

Go to `/prompts` to see the Prompt Library.

Common actions:

- **Search**: Use the search box to filter prompts by name/description/content.
- **Tag filter**: Filter prompts that include a specific tag.
- **Environment filter**: Filter prompts that have publications in a specific environment.
- **Sorting**: Sort by `updatedAt` or `createdAt`.

Each prompt row typically shows:

- Name
- Description (if provided)
- Tags
- Updated time
- Publication indicators (which version is live in dev/stage/prod)

## Creating a new prompt

Go to `/prompts/new`.

A new prompt is created with an **initial version**.

### Step-by-step

1. Click **New Prompt** (or navigate directly to `/prompts/new`).
2. Fill in prompt metadata:
   - **Name**: required
   - **Description**: optional
   - **Owner/Team**: optional
   - **Status**: optional (defaults to Active)
   - **Tags**: optional
3. Provide initial version fields:
   - **Content**: required (the prompt text)
   - **Model name**: optional
   - **Temperature / Max tokens / Top P**: optional
   - **Variables**: optional (see Render Preview)
4. Click **Create** / **Save**.

After creation:

- You are redirected to the prompt detail page.
- The prompt now appears in the prompt library.

## Viewing prompt details

Open a prompt from the library to go to `/prompts/:promptId`.

The detail page typically contains:

- Prompt metadata (name, description, owner/team, status, tags)
- A list of versions (newest first)
- Publication status per environment (which version is active)

From here you can:

- Create a new version
- Publish a version to an environment
- Export the prompt
- Navigate to compare view

## Creating a new version

Versions represent changes over time. A new version is created by **forking** an existing version (often the latest).

### Step-by-step

1. On the prompt detail page, locate the versions list.
2. Choose a base version to fork.
3. Click **New Version** / **Fork**.
4. You will be taken to `/prompts/:promptId/versions/new?from=<versionId>`.
5. Update version fields:
   - Content
   - Notes/changelog
   - Model settings
   - Variables
6. Click **Save**.

Notes:

- Versions are treated as immutable snapshots; editing creates a new version instead of overwriting old ones.
- Use notes to describe what changed (helps auditing and releases).

## Editing prompt metadata

Prompt metadata can be updated without changing version content.

### Typical fields

- Name
- Description
- Owner/team
- Status (Active/Archived)
- Tags

### Step-by-step

1. Open `/prompts/:promptId`.
2. Click **Edit** (or edit inline fields if supported).
3. Update the fields.
4. Click **Save**.

## Publishing a prompt version to an environment

Publishing chooses which version is the “active” one for a given environment.

### How publishing works

- `dev`, `stage`, and `prod` are environments.
- Each environment points to a specific **Prompt Version**.
- Publishing records:
  - Published by
  - Published at
  - Optional release notes

### Step-by-step

1. Open the prompt detail page.
2. Find the version you want to publish.
3. Click **Publish**.
4. Choose the environment (`dev`, `stage`, or `prod`).
5. Optionally add release notes.
6. Confirm.

After publishing:

- The environment indicator updates to show the new active version.
- The active version is now returned from the API endpoint:
  - `GET /prompts/:promptId/active?env=prod`

## Comparing versions

Use the compare screen to understand differences between two versions.

### Step-by-step

1. Go to `/prompts/:promptId/compare`.
2. Select the “left” version and “right” version.
3. Review the diff.

Common uses:

- Review changes before publishing.
- Confirm model settings or variables changed as expected.

## Import / Export

Go to `/import-export`.

### Export a prompt

1. Navigate to a prompt detail page.
2. Click **Export**.
3. Save the downloaded JSON bundle.

The bundle includes:

- Prompt metadata
- All versions
- Tags
- Publications

### Import a prompt

1. Go to `/import-export`.
2. Paste/upload the JSON bundle.
3. Choose mode:
   - **create**: create as a new prompt
   - **merge**: merge into existing prompt (if IDs match)
4. Click **Import**.

## Render Preview (variables)

The Render Preview panel lets you test how the prompt will look when variables are filled.

### Variables

Versions can define variables such as:

- `name` (string)
- `age` (number)
- `isAdmin` (boolean)
- `config` (json)

### Preview workflow

1. Define variables on the version editor.
2. In the preview panel, enter values for variables.
3. The UI renders the prompt with substitutions.
4. If a required variable is missing, you’ll see warnings.

## Common issues / troubleshooting

### “Login failed” but credentials are correct

- Clear the token key `pm_token` from browser storage and try again.
- Verify you’re using the right environment (local vs production).

### CORS errors in the browser console

This usually means the API does not allow your site origin.

- The API must have `CORS_ORIGIN` configured to include the web origin.
- Example: `https://<your-web>.vercel.app`

### Prompts list fails with a server error in production

If the API is using Supabase transaction pooler (PgBouncer), Prisma may require:

- `pgbouncer=true&statement_cache_size=0` on `DATABASE_URL`

Without these, you can see errors like `prepared statement already exists`.

### Local dev ports

Defaults:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

If you see `EADDRINUSE :3001`, another API process is already running. Stop it, then restart dev servers.
