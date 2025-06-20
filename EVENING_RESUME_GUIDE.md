# 🌅 Evening Resume Guide - MindfulAI

## ✅ Current Status (Confirmed Working)
- **GitHub**: All changes successfully pushed to `origin/master`
- **API Keys**: All hardcoded keys removed, using environment variables only
- **Servers**: Multiple working server options available
- **Voice Features**: ChatGPT Live Mode improvements implemented

## 🚀 Quick Start Commands (PowerShell)

### 1. First, Set Your Environment Variables
```powershell
# Create .env file if it doesn't exist
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env file - PLEASE ADD YOUR API KEYS"
}

# Check if API keys are set
Get-Content .env | Select-String "OPENAI_API_KEY"
```

### 2. Start All Servers (Choose ONE method)

**Option A: Use PowerShell Script (Recommended)**
```powershell
.\start-servers.ps1
```

**Option B: Manual Start (3 separate terminals)**
```powershell
# Terminal 1: API Server
node simple-api-server.cjs

# Terminal 2: Voice Server  
node live-voice-server.cjs

# Terminal 3: Frontend
npm run dev
```

**Option C: Background Processes**
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node simple-api-server.cjs"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node live-voice-server.cjs" 
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
```

### 3. Verify Everything is Running
```powershell
# Check ports
netstat -ano | findstr ":3000 :3002 :8081"

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3002/api/health
```

## 🔧 Server Options Available

1. **simple-api-server.cjs** - Basic API server (Port 3000)
2. **working-server.cjs** - Full-featured server with static files (Port 3000)  
3. **live-voice-server.cjs** - WebSocket voice server (Port 3002)
4. **server.js** - ES Modules version (if needed)

## 🎯 Expected URLs
- **Frontend**: http://localhost:8081
- **API Health**: http://localhost:3000/api/health
- **Voice Health**: http://localhost:3002/api/health
- **Chat API**: http://localhost:3000/api/chat

## 🛠️ Troubleshooting Common Issues

### Issue 1: "Path-to-regexp" Error
**Solution**: Use `simple-api-server.cjs` instead of `working-server.cjs`
```powershell
node simple-api-server.cjs
```

### Issue 2: PowerShell Start-Process Error
**Solution**: Use proper PowerShell syntax
```powershell
# Wrong: start cmd /k "node server.cjs"
# Right: Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.cjs"
```

### Issue 3: API Key Not Found
**Solution**: Check .env file exists and has correct format
```powershell
# Check if .env exists
Test-Path .env

# View .env content (safely)
Get-Content .env | Select-String "OPENAI_API_KEY" | ForEach-Object { $_.Line.Substring(0, [Math]::Min($_.Line.Length, 30)) + "..." }
```

### Issue 4: Port Already in Use
**Solution**: Kill existing Node processes
```powershell
# Find Node processes
Get-Process node

# Kill specific process by ID
Stop-Process -Id [ProcessID] -Force

# Or kill all Node processes
Get-Process node | Stop-Process -Force
```

### Issue 5: Frontend Not Loading
**Solution**: Ensure Vite dev server is running
```powershell
# Check if running
netstat -ano | findstr ":8081"

# Start if not running
npm run dev
```

## 🎤 Voice Chat Features (Current Status)

### ✅ Working Features
- **Instant Response**: 0.6-second response times
- **Real Interruptions**: AI stops when you speak
- **Acknowledgments**: AI says "Hmm", "Uh-huh" when interrupted
- **English Speech Recognition**: Fixed language detection
- **Continuous Listening**: Auto-restarts after errors
- **Natural Conversation**: No more repeating 4-5 times

### 🔧 Technical Improvements
- **Speech Recognition**: Changed from hi-IN to en-US
- **Response Speed**: Reduced from 1.2s to 0.6s
- **Auto-Retry**: 100-500ms retry intervals
- **Error Recovery**: Bulletproof restart mechanisms
- **Live Processing**: Partial transcript handling

## 📁 File Structure (Current)
```
MindfulAI-master/
├── simple-api-server.cjs     ← Use this for API (Port 3000)
├── live-voice-server.cjs     ← Use this for Voice (Port 3002)  
├── working-server.cjs        ← Alternative full server
├── server.js                 ← ES Modules version
├── start-servers.ps1         ← PowerShell startup script
├── start-servers.bat         ← Batch startup script
├── .env.example              ← Copy to .env and add keys
└── README.md                 ← Deployment guide
```

## 🚨 Critical Notes

1. **NEVER commit API keys** - Always use .env file
2. **Use simple-api-server.cjs** if you get path-to-regexp errors
3. **Check ports** before starting servers
4. **Test voice chat** after starting both servers
5. **PowerShell syntax** is different from CMD

## 🎯 Success Checklist

Before you start coding:
- [ ] .env file exists with your API keys
- [ ] Port 3000 is running (API server)
- [ ] Port 3002 is running (Voice server)  
- [ ] Port 8081 is running (Frontend)
- [ ] http://localhost:8081 loads the app
- [ ] Voice chat works with instant responses
- [ ] No "path-to-regexp" errors in console

## 🔄 If You Need to Pull Latest Changes
```powershell
# Pull latest changes
git pull origin master

# Reinstall dependencies if needed
npm install

# Restart servers
.\start-servers.ps1
```

---
**Last Updated**: January 20, 2025  
**Status**: ✅ All systems operational, ready for evening work session 