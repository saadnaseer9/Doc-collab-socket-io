"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import styles from './page.module.css';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState('');
  const [documentUsers, setDocumentUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userColor, setUserColor] = useState('');
  const [userId, setUserId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [otherCursors, setOtherCursors] = useState(new Map());
  const [saveStatus, setSaveStatus] = useState('saved');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(1);
  
  const textareaRef = useRef(null);
  const lastChangeRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const cursorOverlayRef = useRef(null);

  // Generate random color for user
  const generateColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF8A80', '#81C784', '#64B5F6'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    // Socket event listeners
    newSocket.on('user-registered', (data) => {
      setUserId(data.userId);
    });

    newSocket.on('documents-list', (docs) => {
      setDocuments(docs);
    });

    newSocket.on('document-created', (doc) => {
      setCurrentDocument(doc);
      setDocumentContent(doc.content);
      setDocumentVersion(doc.version);
    });

    newSocket.on('document-content', (data) => {
      setCurrentDocument(data.document);
      setDocumentContent(data?.document?.content);
      setDocumentUsers(data?.users);
      setDocumentVersion(data?.document?.version);
    });

    newSocket.on('document-content-update', (data) => {
      if (lastChangeRef.current !== 'self') {
        setDocumentContent(data.content);
        setDocumentVersion(data.version);
      }
      lastChangeRef.current = null;
    });

    newSocket.on('user-joined-document', (user) => {
      setDocumentUsers(prev => [...prev.filter(u => u.id !== user.userId), user]);
    });

    newSocket.on('user-left-document', (user) => {
      setDocumentUsers(prev => prev.filter(u => u.id !== user.userId));
      setOtherCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(user.userId);
        return newCursors;
      });
    });

    newSocket.on('user-cursor-update', (data) => {
      setOtherCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(data.userId, data);
        return newCursors;
      });
    });

    newSocket.on('user-editing-state', (data) => {
      setDocumentUsers(prev => 
        prev.map(user => 
          user.id === data.userId 
            ? { ...user, isEditing: data.isEditing }
            : user
        )
      );
    });

    newSocket.on('document-saved', (data) => {
      setSaveStatus('saved');
      console.log('Document auto-saved:', data.savedAt);
    });

    newSocket.on('conflict-resolved', (data) => {
      setCurrentDocument(data.document);
      setDocumentContent(data.document.content);
      setDocumentVersion(data.document.version);
      alert(data.message);
    });

    newSocket.on('document-deleted', (docId) => {
      if (currentDocument && currentDocument.id === docId) {
        setCurrentDocument(null);
        setDocumentContent('');
        alert('The document you were editing has been deleted.');
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Render cursor overlays
  const renderCursorOverlays = useCallback(() => {
    if (!textareaRef.current || !cursorOverlayRef.current) return;

    const textarea = textareaRef.current;
    const overlay = cursorOverlayRef.current;
    
    // Clear existing cursors
    overlay.innerHTML = '';

    otherCursors.forEach((cursor, userId) => {
      const cursorElement = document.createElement('div');
      cursorElement.className = styles.remoteCursor;
      cursorElement.style.backgroundColor = cursor.color;
      
      // Calculate cursor position
      const textBeforeCursor = documentContent.substring(0, cursor.position);
      const lines = textBeforeCursor.split('\n');
      const lineHeight = 20; // Approximate line height
      const charWidth = 8; // Approximate character width
      
      const top = (lines.length - 1) * lineHeight;
      const left = lines[lines.length - 1].length * charWidth;
      
      cursorElement.style.top = `${top + 10}px`;
      cursorElement.style.left = `${left + 20}px`;
      
      // Add username label
      const label = document.createElement('div');
      label.className = styles.cursorLabel;
      label.textContent = cursor.username;
      label.style.backgroundColor = cursor.color;
      cursorElement.appendChild(label);
      
      overlay.appendChild(cursorElement);
    });
  }, [otherCursors, documentContent]);

  useEffect(() => {
    renderCursorOverlays();
  }, [renderCursorOverlays]);

  const joinApp = () => {
    if (!username.trim()) return;
    
    const color = generateColor();
    setUserColor(color);
    setIsConnected(true);
    
    socket.emit('user-joined', {
      username: username.trim(),
      color: color
    });
  };

  const createDocument = () => {
    if (!newDocTitle.trim()) return;
    
    socket.emit('create-document', {
      title: newDocTitle.trim()
    });
    
    setNewDocTitle('');
    setShowCreateForm(false);
  };

  const openDocument = (doc) => {
    socket.emit('join-document', doc.id);
  };

  const deleteDocument = (docId) => {
    if (confirm('Are you sure you want to delete this document?')) {
      socket.emit('delete-document', docId);
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setDocumentContent(newContent);
    lastChangeRef.current = 'self';
    setSaveStatus('saving...');
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for saving
    saveTimeoutRef.current = setTimeout(() => {
      socket.emit('document-change', {
        content: newContent,
        version: documentVersion
      });
    }, 500); // Debounce for 500ms
    
    // Update cursor position
    const cursorPosition = e.target.selectionStart;
    const selection = {
      start: e.target.selectionStart,
      end: e.target.selectionEnd
    };
    
    socket.emit('cursor-update', {
      position: cursorPosition,
      selection: selection
    });
  };

  const handleFocus = () => {
    setIsEditing(true);
    socket.emit('editing-state', true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    socket.emit('editing-state', false);
  };

  const handleSelectionChange = (e) => {
    const cursorPosition = e.target.selectionStart;
    const selection = {
      start: e.target.selectionStart,
      end: e.target.selectionEnd
    };
    
    socket.emit('cursor-update', {
      position: cursorPosition,
      selection: selection
    });
  };

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div className={styles.joinForm}>
          <h1>Join Collaborative Editor</h1>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.usernameInput}
            onKeyPress={(e) => e.key === 'Enter' && joinApp()}
          />
          <button onClick={joinApp} className={styles.joinButton}>
            Join Editor
          </button>
        </div>
      </div>
    );
  }

  if (!currentDocument) {
    return (
      <div className={styles.container}>
        <div className={styles.dashboard}>
          <div className={styles.header}>
            <h1>Document Manager</h1>
            <div className={styles.userInfo}>
              <span className={styles.currentUser} style={{ color: userColor }}>
                {username}
              </span>
            </div>
          </div>

          <div className={styles.documentsSection}>
            <div className={styles.sectionHeader}>
              <h2>Your Documents</h2>
              <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className={styles.createButton}
              >
                + New Document
              </button>
            </div>

            {showCreateForm && (
              <div className={styles.createForm}>
                <input
                  type="text"
                  placeholder="Document title"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className={styles.titleInput}
                  onKeyPress={(e) => e.key === 'Enter' && createDocument()}
                />
                <button onClick={createDocument} className={styles.submitButton}>
                  Create
                </button>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className={styles.documentsList}>
              {documents.map((doc) => (
                <div key={doc.id} className={styles.documentItem}>
                  <div className={styles.documentInfo}>
                    <h3>{doc.title}</h3>
                    <p>Last updated: {new Date(doc.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className={styles.documentActions}>
                    <button 
                      onClick={() => openDocument(doc)}
                      className={styles.openButton}
                    >
                      Open
                    </button>
                    {doc.id !== 'default' && (
                      <button 
                        onClick={() => deleteDocument(doc.id)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.documentTitle}>
          <button 
            onClick={() => setCurrentDocument(null)}
            className={styles.backButton}
          >
            ← Back
          </button>
          <h1>{currentDocument.title}</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.saveStatus}>
            Status: {saveStatus}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.currentUser} style={{ color: userColor }}>
              {username}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.activeUsers}>
        <h3>Collaborators ({documentUsers.length})</h3>
        <div className={styles.usersList}>
          {documentUsers.map((user) => (
            <div key={user.id} className={styles.userItem}>
              <span 
                className={styles.userDot} 
                style={{ backgroundColor: user.color }}
              ></span>
              <span className={styles.username}>{user.username}</span>
              {user.isEditing && (
                <span className={styles.editingIndicator}>✏️ editing</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.editorContainer}>
        <div className={styles.editorWrapper}>
          <textarea
            ref={textareaRef}
            value={documentContent}
            onChange={handleContentChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSelect={handleSelectionChange}
            onClick={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            placeholder="Start writing your document here..."
            className={styles.editor}
          />
          <div 
            ref={cursorOverlayRef}
            className={styles.cursorOverlay}
          ></div>
        </div>
      </div>

      <div className={styles.footer}>
        <p>Version {documentVersion} • Real-time collaborative editing • Auto-save enabled</p>
      </div>
    </div>
  );
}