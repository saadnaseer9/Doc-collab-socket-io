# 📝 Collaborative Document Editor

A real-time collaborative document editor built with **Next.js 14 (App Directory)** and **Socket.IO**. Multiple users can edit documents simultaneously with live cursors, presence indicators, and automatic conflict resolution.


## ✨ Features

### 🏢 **Document Management**
- ✅ Create, edit, and delete documents
- ✅ Document dashboard with overview
- ✅ Real-time document list updates
- ✅ Automatic timestamps

### 👥 **Real-time Collaboration** 
- ✅ Multiple users can edit simultaneously
- ✅ Instant text synchronization (500ms debouncing)
- ✅ Live user presence indicators
- ✅ Join/leave notifications

### 🎯 **Live Cursors & Selection**
- ✅ Real-time cursor position tracking
- ✅ Visual cursor overlays with usernames
- ✅ Color-coded user identification
- ✅ Animated cursor indicators

### 💾 **Auto-save & Conflict Resolution**
- ✅ Automatic saving every 30 seconds
- ✅ Document versioning system
- ✅ Conflict detection and resolution
- ✅ "Last write wins" with version checking
- ✅ Save status indicators

### 🎨 **Modern UI/UX**
- ✅ Responsive design (mobile-friendly)
- ✅ Glassmorphism design elements
- ✅ Smooth animations and transitions
- ✅ Dark/light mode support
- ✅ Professional gradient backgrounds

## 🚀 Live Demo

**Deployed URL:** `https://doc-collab-socket-io-production.up.railway.app/`

### Test Collaboration:
1. Open the URL in multiple browser tabs
2. Join with different usernames
3. Create/edit documents together
4. Watch real-time collaboration magic! ✨

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Directory), React 18
- **Backend:** Custom Next.js server with Socket.IO
- **Real-time:** WebSocket connections
- **Styling:** CSS Modules with modern design
- **Deployment:** Railway (with WebSocket support)

## 📁 Project Structure

```
collab-doc-app/
├── server.js                 # Custom Next.js + Socket.IO server
├── app/
│   ├── layout.js            # Root layout component
│   ├── page.js              # Main application component
│   ├── page.module.css      # Component-specific styles
│   └── globals.css          # Global styles
├── package.json
├── next.config.js
└── README.md
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### 1. Clone Repository
```bash
git clone <https://github.com/saadnaseer9/Doc-collab-socket-io.git>

```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
node server.js
```

### 4. Open Browser
Navigate to `http://localhost:3000`

## 📦 Dependencies

```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "socket.io": "^4.7.4",
    "socket.io-client": "^4.7.4",
    "uuid": "^9.0.0"
  }
}
```

## 🚀 Deployment

### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Other Platforms
- ✅ **Render:** Great WebSocket support
- ✅ **Fly.io:** Excellent global performance  
- ✅ **Heroku:** Popular with good ecosystem
- ✅ **DigitalOcean App Platform:** Managed service

### Important: Update CORS for Production
```javascript
// In server.js
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://your-production-url.com"],
    methods: ["GET", "POST"]
  }
});
```

## 🔄 Architecture

### Client-Side (Frontend)
- **React Components:** Modern functional components with hooks
- **Socket.IO Client:** Real-time communication
- **State Management:** React useState/useEffect
- **Responsive Design:** Mobile-first approach

### Server-Side (Backend)
- **Custom Next.js Server:** Handles both HTTP and WebSocket
- **Socket.IO Server:** Manages real-time events
- **In-Memory Storage:** Document and user session storage
- **Event-Driven:** Real-time collaboration events

### WebSocket Events
```javascript
// Client → Server
'user-joined'          // User authentication
'create-document'      // Document creation  
'join-document'        // Join specific document
'document-change'      // Content updates
'cursor-update'        // Cursor position changes
'editing-state'        // Editing status updates

// Server → Client
'documents-list'       // Available documents
'document-content'     // Document data
'user-cursor-update'   // Other users' cursors
'document-saved'       // Auto-save confirmations
'conflict-resolved'    // Conflict resolution
```

## 📱 Usage Guide

### 1. **Join Application**
- Enter your username
- Get assigned a unique color
- Access document dashboard

### 2. **Document Management**
- View all available documents
- Create new documents with custom titles
- Delete documents (except default)
- See real-time document updates

### 3. **Collaborative Editing**
- Open any document to start editing
- See other collaborators in real-time
- Watch live cursor movements
- Automatic conflict resolution
- Auto-save with status indicators

### 4. **Multi-Device Support**
- Works on desktop, tablet, and mobile
- Responsive design adapts to screen size
- Touch-friendly interface

## ⚡ Performance Features

- **Debounced Updates:** 500ms delay prevents excessive API calls
- **Efficient Re-renders:** Optimized React state management
- **Memory Management:** Automatic cleanup of disconnected users
- **Compression Ready:** Gzip-friendly code structure

## 🔒 Security Considerations

### Current Implementation
- Basic user session management
- CORS protection for WebSocket connections
- Input sanitization for document content





