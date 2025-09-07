const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// In-memory storage (in production, use a database)
const documents = new Map();
const activeUsers = new Map();
const documentUsers = new Map(); // Track users per document

// Initialize with a default document
const defaultDoc = {
  id: 'default',
  title: 'Welcome Document',
  content: 'Welcome to the collaborative document editor!\n\nStart typing to see real-time collaboration in action.',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1
};
documents.set('default', defaultDoc);

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handler(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Auto-save functionality
  const autoSave = () => {
    setInterval(() => {
      // In a real app, this would save to database
      console.log(`Auto-saved ${documents.size} documents at ${new Date().toISOString()}`);
    }, 30000); // Auto-save every 30 seconds
  };
  autoSave();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send available documents
    socket.emit('documents-list', Array.from(documents.values()));

    // Handle user joining
    socket.on('user-joined', (userData) => {
      activeUsers.set(socket.id, {
        id: socket.id,
        username: userData.username,
        color: userData.color,
        currentDocument: null,
        isEditing: false,
        cursorPosition: 0,
        selection: { start: 0, end: 0 }
      });
      
      socket.emit('user-registered', { userId: socket.id });
      console.log(`User ${userData.username} joined`);
    });

    // Handle document creation
    socket.on('create-document', (data) => {
      const docId = uuidv4();
      const newDoc = {
        id: docId,
        title: data.title || 'Untitled Document',
        content: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      
      documents.set(docId, newDoc);
      io.emit('documents-list', Array.from(documents.values()));
      socket.emit('document-created', newDoc);
    });

    // Handle document deletion
    socket.on('delete-document', (docId) => {
      if (documents.has(docId) && docId !== 'default') {
        documents.delete(docId);
        
        // Remove users from deleted document
        if (documentUsers.has(docId)) {
          const usersInDoc = documentUsers.get(docId);
          usersInDoc.forEach(userId => {
            io.to(userId).emit('document-deleted', docId);
          });
          documentUsers.delete(docId);
        }
        
        io.emit('documents-list', Array.from(documents.values()));
      }
    });

    // Handle joining a document
    socket.on('join-document', (docId) => {
      const user = activeUsers.get(socket.id);
      const document = documents.get(docId);
      
      if (!user || !document) return;

      // Leave previous document room
      if (user.currentDocument) {
        socket.leave(user.currentDocument);
        removeUserFromDocument(user.currentDocument, socket.id);
      }

      // Join new document room
      socket.join(docId);
      user.currentDocument = docId;
      addUserToDocument(docId, socket.id);

      // Send document content
      socket.emit('document-content', {
        document: document,
        users: getDocumentUsers(docId)
      });

      // Notify others in the document
      socket.to(docId).emit('user-joined-document', {
        userId: socket.id,
        username: user.username,
        color: user.color
      });
    });

    // Handle document content changes with conflict resolution
    socket.on('document-change', (data) => {
      const user = activeUsers.get(socket.id);
      if (!user || !user.currentDocument) return;

      const document = documents.get(user.currentDocument);
      if (!document) return;

      // Simple conflict resolution - last write wins with version checking
      if (data.version && data.version < document.version) {
        // Conflict detected, send current version back
        socket.emit('conflict-resolved', {
          document: document,
          message: 'Your changes conflicted with recent updates. Document refreshed.'
        });
        return;
      }

      // Update document
      document.content = data.content;
      document.updatedAt = new Date();
      document.version += 1;

      // Broadcast to all users in this document except sender
      socket.to(user.currentDocument).emit('document-content-update', {
        content: data.content,
        version: document.version,
        updatedBy: user.username
      });

      // Auto-save trigger
      setTimeout(() => {
        socket.emit('document-saved', {
          documentId: user.currentDocument,
          version: document.version,
          savedAt: document.updatedAt
        });
      }, 2000);
    });

    // Handle editing state
    socket.on('editing-state', (isEditing) => {
      const user = activeUsers.get(socket.id);
      if (user) {
        user.isEditing = isEditing;
        if (user.currentDocument) {
          socket.to(user.currentDocument).emit('user-editing-state', {
            userId: socket.id,
            username: user.username,
            isEditing: isEditing
          });
        }
      }
    });

    // Handle cursor/selection updates
    socket.on('cursor-update', (data) => {
      const user = activeUsers.get(socket.id);
      if (user && user.currentDocument) {
        user.cursorPosition = data.position;
        user.selection = data.selection;
        
        socket.to(user.currentDocument).emit('user-cursor-update', {
          userId: socket.id,
          username: user.username,
          color: user.color,
          position: data.position,
          selection: data.selection
        });
      }
    });

    // Handle document title updates
    socket.on('update-document-title', (data) => {
      const document = documents.get(data.docId);
      if (document) {
        document.title = data.title;
        document.updatedAt = new Date();
        io.emit('documents-list', Array.from(documents.values()));
        
        if (documentUsers.has(data.docId)) {
          io.to(data.docId).emit('document-title-updated', {
            docId: data.docId,
            title: data.title
          });
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        console.log(`User ${user.username} disconnected`);
        
        if (user.currentDocument) {
          removeUserFromDocument(user.currentDocument, socket.id);
          socket.to(user.currentDocument).emit('user-left-document', {
            userId: socket.id,
            username: user.username
          });
        }
        
        activeUsers.delete(socket.id);
      }
    });
  });

  // Helper functions
  function addUserToDocument(docId, userId) {
    if (!documentUsers.has(docId)) {
      documentUsers.set(docId, new Set());
    }
    documentUsers.get(docId).add(userId);
  }

  function removeUserFromDocument(docId, userId) {
    if (documentUsers.has(docId)) {
      documentUsers.get(docId).delete(userId);
      if (documentUsers.get(docId).size === 0) {
        documentUsers.delete(docId);
      }
    }
  }

  function getDocumentUsers(docId) {
    if (!documentUsers.has(docId)) return [];
    
    const userIds = Array.from(documentUsers.get(docId));
    return userIds.map(userId => activeUsers.get(userId)).filter(Boolean);
  }

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});