# MakersTab - Cursor IDE Migration Guide

## What is Cursor?

Cursor is an AI-first code editor built on VS Code that provides:
- AI-powered code completion (like GitHub Copilot++)
- Chat with your codebase
- Multi-file editing with AI
- Better context understanding
- Built-in terminal and git

## Prerequisites

1. **Download Cursor**: https://cursor.sh/
2. **Have Git installed**: For version control
3. **Node.js & Python**: Already configured in your system

---

## Step 1: Export Your Code from Emergent

### Option A: Download via GitHub (Recommended)

If your project is connected to GitHub:

```bash
# On your local machine
git clone https://github.com/YOUR_USERNAME/makerstab.git
cd makerstab
```

### Option B: Download as ZIP

1. In Emergent platform, look for "Download Project" or "Export"
2. Extract the ZIP file to your desired location
3. Initialize git:

```bash
cd makerstab
git init
git add .
git commit -m "Initial commit from Emergent"
```

### Option C: Manual Copy (Current Method)

Since you're on Emergent, copy the entire project structure:

```
makerstab/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
├── scripts/
│   ├── backup_db.sh
│   └── restore_db.sh
├── README.md
└── CURSOR_MIGRATION_GUIDE.md (this file)
```

---

## Step 2: Set Up Local Environment

### Install MongoDB Locally

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Ubuntu/Debian:**
```bash
sudo apt-get install gnupg curl
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Windows:**
- Download installer: https://www.mongodb.com/try/download/community
- Run installer with default settings
- MongoDB runs as a Windows service

### Verify MongoDB
```bash
mongosh
# Should connect to mongodb://localhost:27017
```

---

## Step 3: Configure Environment

### Backend `.env` File

Create `/backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=meal_plan_tracker
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production-makeitlongandcomplex
EMERGENT_LLM_KEY=sk-emergent-YOUR_KEY_HERE
```

### Frontend `.env` File

Create `/frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

## Step 4: Install Dependencies

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend

# Install dependencies (use yarn, not npm)
yarn install
```

---

## Step 5: Open in Cursor

1. **Launch Cursor**
2. **Open Folder**: File → Open Folder → Select `makerstab` directory
3. **Cursor will index your codebase** (takes 1-2 minutes)

---

## Step 6: Configure Cursor Settings

### Essential Extensions

Cursor will prompt to install recommended extensions. Install these:

- **Python** (Microsoft)
- **Pylance** (Microsoft)
- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **MongoDB for VS Code**
- **GitLens** (optional but useful)

### Cursor Settings (`.vscode/settings.json`)

Create this file in your project root:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["className\\s*=\\s*{([^}]*)}"]
  ],
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/node_modules": true,
    "**/.DS_Store": true
  }
}
```

---

## Step 7: Running the Application

### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Terminal 2 - Frontend

```bash
cd frontend
yarn start
```

### Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- Health Check: http://localhost:8001/api/health

---

## Step 8: Using Cursor AI Features

### 1. **Cursor Chat (Cmd/Ctrl + L)**

Ask questions about your codebase:

```
"How does the receipt upload work?"
"Where is the meal plan balance updated?"
"Show me all authentication endpoints"
```

### 2. **Inline Edit (Cmd/Ctrl + K)**

Select code and ask for changes:

```
"Add error handling here"
"Make this function async"
"Add TypeScript types"
```

### 3. **Composer (Cmd/Ctrl + I)**

Multi-file editing:

```
"Add a dark mode feature"
"Create a new export transactions feature"
"Refactor the analytics calculation"
```

### 4. **Auto-Complete**

Just start typing - Cursor predicts entire functions based on context

### 5. **Chat with Docs**

```
"@Web how do I use React lazy loading?"
"@Docs show me FastAPI authentication examples"
```

---

## Step 9: Restore Data from Backup

If you have a backup from Emergent:

```bash
# Copy backup file to local /app/backups/
./scripts/restore_db.sh /app/backups/makerstab_backup_YYYYMMDD_HHMMSS.gz
```

---

## Step 10: Git Workflow

### Initialize Repository

```bash
git init
git add .
git commit -m "Initial commit - MakersTab from Emergent"
```

### Create GitHub Repository

1. Go to https://github.com/new
2. Create repository "makerstab"
3. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/makerstab.git
git branch -M main
git push -u origin main
```

### Cursor Git Features

- **Source Control Panel**: Cmd/Ctrl + Shift + G
- **Commit**: Type message and click ✓
- **Push/Pull**: Click sync button
- **View Changes**: Click files to see diffs

---

## Differences Between Emergent and Cursor

| Feature | Emergent | Cursor (Local) |
|---------|----------|----------------|
| **Environment** | Cloud-hosted | Local machine |
| **Database** | Managed MongoDB | Local MongoDB |
| **Deployment** | Automatic | Manual (or CI/CD) |
| **AI Features** | Agent-based | Inline & Chat |
| **Debugging** | Logs only | Full debugger |
| **Performance** | Resource limits | Full local resources |
| **Collaboration** | Built-in | Git + GitHub |

---

## Common Issues & Solutions

### Issue: MongoDB Connection Failed

**Solution:**
```bash
# Check MongoDB is running
mongosh

# If not running:
# macOS: brew services start mongodb-community
# Ubuntu: sudo systemctl start mongod
# Windows: Check Services app
```

### Issue: Port Already in Use

**Solution:**
```bash
# Find process using port
lsof -i :8001  # macOS/Linux
netstat -ano | findstr :8001  # Windows

# Kill process or use different port
uvicorn server:app --reload --port 8002
```

### Issue: Package Installation Failed

**Solution:**
```bash
# Backend
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall

# Frontend
rm -rf node_modules package-lock.json
yarn install
```

### Issue: CORS Errors

**Solution:**
Update `backend/.env`:
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## Deployment Options from Cursor

### Option 1: Deploy to Vercel (Frontend) + Railway (Backend)

**Frontend:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

**Backend:**
1. Go to https://railway.app/
2. Connect GitHub
3. Select repository
4. Configure environment variables
5. Deploy

### Option 2: Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongo_data:
```

Deploy:
```bash
docker-compose up -d
```

### Option 3: Keep Using Emergent

You can continue using Emergent for deployment while developing in Cursor:

1. Develop and test locally in Cursor
2. Push changes to GitHub
3. Pull changes in Emergent
4. Deploy from Emergent

---

## Cursor Keyboard Shortcuts

### Essential Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Command Palette | Cmd+Shift+P | Ctrl+Shift+P |
| Cursor Chat | Cmd+L | Ctrl+L |
| Inline Edit | Cmd+K | Ctrl+K |
| Composer | Cmd+I | Ctrl+I |
| Search Files | Cmd+P | Ctrl+P |
| Search Text | Cmd+Shift+F | Ctrl+Shift+F |
| Terminal | Cmd+` | Ctrl+` |
| Git Panel | Cmd+Shift+G | Ctrl+Shift+G |

---

## Next Steps

1. ✅ Set up local environment
2. ✅ Import project to Cursor
3. ✅ Test application locally
4. ✅ Explore Cursor AI features
5. ⬜ Set up Git repository
6. ⬜ Configure deployment pipeline
7. ⬜ Add more features with Cursor's help!

---

## Support Resources

- **Cursor Docs**: https://cursor.sh/docs
- **Cursor Discord**: https://discord.gg/cursor
- **MakersTab Issues**: Create issues in your GitHub repo
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/

---

## Pro Tips for Cursor

1. **Use `@` mentions**: `@workspace`, `@web`, `@docs` for better context
2. **Chat with specific files**: Right-click file → "Add to Chat"
3. **Create Rules**: `.cursorrules` file for project-specific AI behavior
4. **Keyboard shortcuts**: Learn them early for 10x productivity
5. **Git integration**: Commit often, Cursor helps write commit messages
6. **Debug mode**: Use breakpoints instead of print statements
7. **Extensions**: Install Python, React, Tailwind extensions

---

**Happy Coding with Cursor! 🚀**

If you have questions, ask Cursor: "How do I do X in this codebase?"
