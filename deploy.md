# Deploy Relay

This project is an npm-workspaces monorepo: the Express API is in `server/` and the Next.js app is in `client/`. Deploy the API to Render and the client to Vercel. Do not commit `.env` or paste secrets into GitHub, this guide, or chat.

## 1. Rotate the exposed AI key

A provider key was present in the old `.env.example`. That value has been removed, but treat it as exposed: revoke it in the provider console and create a replacement. Put the new value only in the local `.env` or the hosting provider's secret environment settings.

## 2. Create a Git repository for this project

The project folder currently resolves to a Git root in the parent `C:\Users\Akash` directory. Do not push from that parent folder. Open PowerShell and initialize a repository inside `AiAutomation`:

```powershell
Set-Location "$HOME\Desktop\AiAutomation"
git init
git branch -M main
git rev-parse --show-toplevel
```

The last command must print a path ending in `Desktop\AiAutomation`. If it prints `C:\Users\Akash`, stop and check that the project-local `.git` folder exists before staging anything.

Review ignored files and changes before staging:

```powershell
git check-ignore -v .env
git status --short
```

`.env` must be ignored. `.env.example` is safe to commit and contains placeholders only. Review `git status` for any other credentials or private files, then stage and commit:

```powershell
git add .
git status --short
git diff --cached
git commit -m "Prepare Relay for deployment"
```

Create an empty GitHub repository, then connect and push it:

```powershell
git remote add origin https://github.com/<your-user>/<your-repository>.git
git push -u origin main
```

If `origin` already exists, inspect it with `git remote -v` instead of adding a second remote.

## 3. Deploy the API on Render

1. In Render, create a **Web Service** from the GitHub repository.
2. Set **Root Directory** to the repository root (`.`), not `server`; the npm workspace lockfile is at the root.
3. Use these commands:

   - Build: `npm ci && npm run build --workspace=server`
   - Start: `npm run start --workspace=server`
   - Health check path: `/api/health`

4. Set the Render environment variables:

   - `NODE_ENV=production`
   - `CLIENT_URL=https://<your-production-vercel-domain>` (origin only; no trailing slash or path)
   - `JWT_SECRET=<a new long random secret>`
   - `CREDENTIAL_ENCRYPTION_KEY=<a different new random secret>`
   - `MONGODB_URI=<your Atlas connection string>`
   - `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY` if hosted AI generation is desired
   - OAuth client IDs, secrets, and callback URLs only for integrations you configure
   - `REDIS_URL` only if you have a Redis service

   Render supplies `PORT`; leave it unset manually. Generate secrets locally without sharing them:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Use separate outputs for `JWT_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`. Keep the same encryption key after deployment; changing it makes stored integration credentials unreadable.

5. For persistent users and workflows, configure a reachable MongoDB database and a database user in Atlas. Restrict Atlas Network Access to Render's outbound IPs when available. Avoid opening access to every IP except as a temporary, deliberate choice.
6. After the first deploy, copy the Render service URL, for example `https://relay-api.onrender.com`. The API base URL is that origin plus `/api`.

## 4. Deploy the frontend on Vercel

1. Import the same GitHub repository as a Vercel project.
2. Set **Root Directory** to `client`, select the Next.js framework, and enable **Include source files outside the Root Directory in the Build Step** so the root workspace manifest and lockfile are available.
3. Set the Install Command to `cd .. && npm ci` so npm installs from the workspace root. Set the Build Command to `npm run build` so Next.js builds from `client/`.
4. Add these environment variables for Production (and Preview only if its origin is allowed by the API):

   - `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api`
   - `NEXT_PUBLIC_SOCKET_URL=https://<your-render-service>.onrender.com`

   The API URL includes `/api`; the Socket.IO URL does not. Set them before building, then deploy or redeploy.
5. Copy the production Vercel origin, such as `https://relay-console.vercel.app`, into Render's `CLIENT_URL`, then redeploy the Render service.

The API currently allows one exact browser origin. Use the production Vercel URL for `CLIENT_URL`; Vercel preview URLs will not pass CORS unless the API is extended with an explicit origin allowlist.

## 5. Configure OAuth callbacks (optional)

Register the exact Render callback URL in each provider's developer console and set the matching environment variable on Render:

- Google: `GOOGLE_REDIRECT_URI=https://<render-domain>/api/integrations/oauth/google/callback`
- Slack: `SLACK_REDIRECT_URI=https://<render-domain>/api/integrations/oauth/slack/callback`
- Discord: `DISCORD_REDIRECT_URI=https://<render-domain>/api/integrations/oauth/discord/callback`

Also set the provider's corresponding `*_CLIENT_ID` and `*_CLIENT_SECRET`. Google OAuth connects Gmail and Google Sheets in this app.

## 6. Verify deployment

1. Open `https://<render-domain>/api/health`. Confirm `status` is `ok` and `persistence` is `mongodb`. `memory-fallback` means the app is running but data will be lost on restart.
2. Open the Vercel URL, register a user, and create a workflow.
3. Generate a graph. With a valid hosted AI key, the builder reports the provider; without one, it reports that it used the local rule-based fallback.
4. Connect an integration before running a workflow that sends external actions. Check the **Executions** screen for its events and result.

Redis is optional; without it, the API uses an in-memory execution queue. For durable production execution queues, configure Redis as well as MongoDB.
