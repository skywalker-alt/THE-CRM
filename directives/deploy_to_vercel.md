# Directive: Deploying to Vercel (GitHub Integration)

## Objective
To deploy and maintain a web application using GitHub for version control and Vercel for hosting, ensuring all environment variables and serverless function routing are correctly handled.

## Prerequisites
- A GitHub account.
- A Vercel account linked to GitHub.
- Local Git initialized and pushed to a GitHub repository.

## Workflow

### 1. Preparation
- **Routing**: Ensure a `vercel.json` exists in the root with standard SPA and API routing.
- **API Structure**: Node.js functions must reside in the `api/` directory.
- **Dependencies**: Ensure `package.json` includes `@vercel/blob` if using file storage.

### 2. Deployment Steps
1. **GitHub Push**: Ensure `main` branch is up to date.
   ```bash
   git add .
   git commit -m "pre-deployment sync"
   git push origin main
   ```
2. **Vercel Import**: Use the Vercel Dashboard to import the repository.
3. **Environment Sync**: Manually copy all keys from the local `.env` (or Supabase dashboard) to the "Environment Variables" section in Vercel settings.

### 3. Vercel Blob Setup (If applicable)
- In the Vercel Project Dashboard, go to **Storage** -> **Create Database** -> **Blob**.
- Select the project to link.
- This creates the `BLOB_READ_WRITE_TOKEN` automatically. **Do not modify this token manually.**

## Common Errors & Solutions

| Error | Cause | Fix |
| :--- | :--- | :--- |
| **413 Payload Too Large** | Video/File sent directly to `/api/` function. | Use `@vercel/blob/client`'s `handleUpload` for client-side uploads. |
| **404 on Page Refresh** | Client-side routing not handled by Vercel. | Use `vercel.json` with a rewrite rule: `{ "src": "/(.*)", "dest": "/index.html" }`. |
| **Missing DB Records** | Local DB usage vs Production DB. | Ensure the `SUPABASE_URL` in Vercel points to the live project, not a local mock. |
| **CORS Errors** | API called from a different domain. | Add `Access-Control-Allow-Origin: *` headers in the `api/*.js` file response. |

## Verification
- Visit the Vercel deployed URL and test the form submission.
- Check Vercel **Function Logs** if a submission fails to ensure the API logic is executing.
