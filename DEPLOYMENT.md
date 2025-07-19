# SignTusk Deployment Guide

## Render Deployment

This project is configured to deploy on Render using the `render.yaml` file.

### Automatic Deployment
1. Connect your GitHub repository to Render
2. The `render.yaml` file will automatically configure the deployment
3. Render will use these settings:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node.js
   - **Port**: 10000

### Manual Configuration (if not using render.yaml)
If you prefer to configure manually in the Render dashboard:

1. **Service Type**: Web Service
2. **Environment**: Node
3. **Build Command**: `npm ci && npm run build`
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=10000`

### Important Notes
- Do NOT set a "Publish Directory" - leave it empty
- The app builds to `.next` directory (standard for Next.js)
- API routes are included and will work on Render
- Make sure your repository includes the `render.yaml` file

### Local Testing
```bash
npm install
npm run build
npm start
```

The app should be accessible at `http://localhost:3000`

### Troubleshooting
- If build fails, check that all dependencies are in `package.json`
- If "command not found" errors occur, try deleting `node_modules` and running `npm install`
- If "publish directory not found" error occurs, ensure you're not setting a publish directory in Render settings