# RaceIQ Netlify Deployment Guide

This guide will help you deploy RaceIQ to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://www.netlify.com)
2. Git repository (GitHub, GitLab, or Bitbucket)
3. All data analysis completed and JSON files generated

## Step 1: Prepare Your Repository

1. **Generate Data Files**: Make sure you've run the analysis pipeline:
   ```bash
   cd Data_analysis
   python main.py
   ```
   This will generate all JSON files in `frontend/public/data/`

2. **Commit All Files**: 
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push
   ```

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Click "Add new site"** → **"Import an existing project"**
3. **Connect to Git**: Choose your Git provider (GitHub, GitLab, or Bitbucket)
4. **Select Repository**: Choose your RaceIQ repository
5. **Configure Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
6. **Click "Deploy site"**

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize Netlify** (from project root):
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Choose your team
   - Site name (or press Enter for auto-generated name)
   - Build command: `cd frontend && npm run build`
   - Directory to deploy: `frontend/build`

4. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

## Step 3: Verify Deployment

1. After deployment, Netlify will provide you with a URL (e.g., `https://your-site-name.netlify.app`)
2. Visit the URL and verify:
   - All pages load correctly
   - Data visualizations display properly
   - Navigation works (React Router)
   - JSON data files are accessible

## Step 4: Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow the instructions to configure your domain

## Troubleshooting

### Build Fails

- **Check Node version**: Netlify uses Node 18 by default (configured in `netlify.toml`)
- **Check build logs**: Go to **Deploys** → Click on failed deploy → View logs
- **Common issues**:
  - Missing dependencies: Ensure `package.json` has all required packages
  - Build errors: Check for TypeScript/ESLint errors
  - Missing data files: Ensure JSON files are in `frontend/public/data/`

### Data Files Not Loading

- **Check paths**: Data files should be in `frontend/public/data/`
- **Check browser console**: Look for 404 errors
- **Verify file names**: Ensure file names match exactly (case-sensitive)

### Routing Issues

- **SPA Routing**: The `_redirects` file ensures all routes redirect to `index.html`
- **If routes don't work**: Check that `_redirects` file is in `frontend/public/`

### Re-deploy After Data Updates

1. **Regenerate data**:
   ```bash
   cd Data_analysis
   python main.py
   ```

2. **Commit and push**:
   ```bash
   git add frontend/public/data/
   git commit -m "Update data files"
   git push
   ```

3. **Netlify will auto-deploy** (if connected to Git) or manually trigger deploy from dashboard

## Environment Variables (If Needed)

If you need environment variables:

1. Go to **Site settings** → **Environment variables**
2. Add variables (e.g., API keys)
3. Redeploy

## Continuous Deployment

Netlify automatically deploys when you push to your main branch (if connected to Git). You can configure branch deployments in **Site settings** → **Build & deploy** → **Continuous Deployment**.

## Build Performance

- **Build time**: Typically 2-5 minutes
- **Build cache**: Netlify caches `node_modules` between builds
- **Optimize**: Consider using Netlify's build plugins for optimization

## Support

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Community**: https://community.netlify.com

---

**Note**: Make sure all JSON data files are generated and committed before deploying!

