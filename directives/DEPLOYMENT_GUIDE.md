# Deployment Guide: GitHub & Vercel Workflow

This document outlines the "Perfect Workflow" for deploying a modern web application (like the UNI Form or CRM) using GitHub for version control and Vercel for hosting and serverless functions.

## 1. Initial Project Setup (Local)

Before deploying, ensure your project is ready for a serverless environment.

*   **API Folder**: Ensure all your serverless functions (Node.js) are in an `api/` directory. Vercel automatically treats files here as endpoints.
*   **vercel.json**: Create a `vercel.json` file to handle custom routing. This prevents 404 errors on refresh and correctly maps your API.
    ```json
    {
      "version": 2,
      "routes": [
        { "src": "/api/(.*)", "dest": "/api/$1.js" },
        { "src": "/(.*)", "dest": "/$1" }
      ]
    }
    ```
*   **Environment Variables**: Create a `.env` file for local testing (added to `.gitignore`).

---

## 2. GitHub Strategy

GitHub is the "source of truth". Vercel will deploy every time you push to the `main` branch.

1.  **Initialize Git**:
    ```powershell
    git init
    git add .
    git commit -m "Initialize project"
    ```
2.  **Create Repository**: Create a new public/private repository on GitHub.
3.  **Link and Push**:
    ```powershell
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git branch -M main
    git push -u origin main
    ```

---

## 3. Vercel Deployment Strategy

1.  **Import Project**: Sign in to [Vercel](https://vercel.com) and click **"Add New" > "Project"**. Import your GitHub repository.
2.  **Configure Framework**: Vercel usually detects "Other" for vanilla HTML projects. Leave "Build and Output Settings" as default.
3.  **Environment Variables (CRITICAL)**:
    *   This is where most projects fail. Copy every key from your `.env` into the Vercel dashboard.
    *   **Common keys**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOB_READ_WRITE_TOKEN`.
4.  **Deploy**: Click **Deploy**. Vercel will provide a URL (e.g., `uni-creator-form.vercel.app`).

---

## 4. The "Vercel Blob" Configuration (Special Step)

Because hosting providers like Vercel have a **4.5MB limit** on request bodies, you cannot upload large videos through a normal API endpoint. 

### The Solution: Client-Side Uploading
We fixed the deployment error by moving from "Server-Side Upload" to **Client-Side Upload**:
1.  **Vercel Dashboard**: Go to the "Storage" tab and create a **Blob Store**.
2.  **link**: Link it to your project. This automatically adds the `BLOB_READ_WRITE_TOKEN`.
3.  **API Handler**: Your `api/upload.js` should only generate a token using `handleUpload`.
4.  **Frontend**: The browser uses that token to upload the video *directly* to Vercel's servers, bypassing the 4.5MB limit.

---

## 5. Troubleshooting: The Error We Encountered

### The "Body Too Large" / "Payload Too Large" Error
*   **Symptom**: The form works for small files but fails (413 Payload Too Large) for actual videos.
*   **Fix**: Never send the video file to your `/api/` function. Send it directly to `@vercel/blob` from the client.
*   **Reference**: See `api/upload.js` and the `uploadFile` function in `video-submission.js`.

### The "Supabase Region" Error
*   **Symptom**: API calls to Supabase are slow or timeout.
*   **Useful Tip**: When creating your Supabase project, choose the **same region** as your Vercel deployment (e.g., "Washington, D.C. (us-east-1)") to minimize latency.

---

## 6. Maintenance & Performance

*   **Preview Deployments**: When you make a change, create a new branch in Git. Vercel will give you a "Preview URL" to test the changes before they hit the live site.
*   **Logs**: If an API fails, go to the **"Logs"** tab in Vercel. It is much more detailed than the browser console for server-side errors.
