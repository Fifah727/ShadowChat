import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import '../icon/fontawesome-free-6.5.1-web/css/fontawesome.min.css';
import '../icon/fontawesome-free-6.5.1-web/css/all.min.css';
import '../styles/Chat.css';

function Chat() {
    const [message, setMessage] = useState('');
    const [masterMessages, setMasterMessages] = useState([]);
    const [privateMessages, setPrivateMessages] = useState({});
    const [username, setUsername] = useState('');
    const [mdp, setMdp] = useState('');
    const [isUsernameSet, setIsUsernameSet] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState({});
    const [activeConversation, setActiveConversation] = useState('Master');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [theme, setTheme] = useState('light');

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
    }, []);

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // Scroll automatique
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [masterMessages, privateMessages, activeConversation]);

    const initSocket = () => {
        const newSocket = io('http://localhost:5001');
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('Connecté au serveur');
        });

        newSocket.on('connected', (data) => {
            console.log('ID session:', data.session_id);
        });

        newSocket.on('receive_message', (msg) => {
            if (msg.room === 'Master') {
                setMasterMessages((prev) => [...prev, msg]);
            } else if (msg.private && msg.user) {
                setPrivateMessages((prev) => ({
                    ...prev,
                    [msg.user]: [...(prev[msg.user] || []), msg],
                }));
            }
        });

        newSocket.on('user_list', (users) => {
            setConnectedUsers(users);
        });

        newSocket.on('username_taken', () => {
            alert('Nom d’utilisateur déjà pris');
        });

        newSocket.on('username_set_success', (uname) => {
            setUsername(uname);
            setIsUsernameSet(true);
            newSocket.emit('join_room', { room: 'Master' });
        });

        newSocket.on('set_username_failed', (error) => {
            alert(error);
        });

        newSocket.on('file_uploaded', (data) => {
            const fileMsg = {
                user: data.sender,
                text: `a envoyé un fichier : `,
                file: { name: data.filename, url: data.url },
            };

            if (activeConversation === 'Master') {
                setMasterMessages((prev) => [...prev, fileMsg]);
            } else {
                setPrivateMessages((prev) => ({
                    ...prev,
                    [data.sender]: [...(prev[data.sender] || []), fileMsg],
                }));
            }
        });

        newSocket.on('file_error', (error) => {
            console.error('Erreur fichier :', error);
        });
    };

    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (username.trim() && mdp.trim()) {
            if (!socketRef.current) initSocket();
            setTimeout(() => {
                socketRef.current?.emit('set_username', {
                    username: username.trim(),
                    mdp: mdp.trim(),
                });
            }, 200); // Petit délai pour s'assurer que la connexion est bien prête
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && socketRef.current) {
            const content = message.trim();

            if (activeConversation !== 'Master') {
                socketRef.current.emit('private_message', {
                    recipient: activeConversation,
                    message: content,
                    anonymous: isAnonymous,
                });

                setPrivateMessages((prev) => ({
                    ...prev,
                    [activeConversation]: [
                        ...(prev[activeConversation] || []),
                        { user: 'Vous', text: content },
                    ],
                }));
            } else {
                socketRef.current.emit('send_message', {
                    message: content,
                    room: 'Master',
                    anonymous: isAnonymous,
                });
            }

            setMessage('');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && socketRef.current) {
            const reader = new FileReader();

            reader.onload = (event) => {
                const payload = {
                    filename: file.name,
                    filedata: event.target.result,
                    anonymous: isAnonymous,
                };

                if (activeConversation !== 'Master') {
                    payload.recipient = activeConversation;
                } else {
                    payload.room = 'Master';
                }

                socketRef.current.emit('upload_file', payload);
            };

            reader.readAsDataURL(file);
            e.target.value = null;
        }
    };

    const handleSelectConversation = (conversation) => {
        setActiveConversation(conversation);
    };

    // DECONNEXION
    const handleLogout = () => {
        if (socketRef.current) {
            socketRef.current.disconnect(); // Déconnecte le socket proprement
            socketRef.current = null;
        }
        // Réinitialise les états nécessaires
        setIsUsernameSet(false);
        setUsername('');
        setMdp('');
        setMessage('');
        setMasterMessages([]);
        setPrivateMessages({});
        setConnectedUsers({});
        setActiveConversation('Master');
    };
    
    // ---------------------- Interface de connexion ----------------------

    if (!isUsernameSet) {
        return (
            <div className="login-container">
                <h2 className="login-title">Inscrivez-vous</h2>
                <form onSubmit={handleUsernameSubmit} className="login-form">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Entrez votre pseudo"
                        className="login-input"
                    />
                    <input
                        type="password"
                        value={mdp}
                        onChange={(e) => setMdp(e.target.value)}
                        placeholder="Mot de passe"
                        className="login-input"
                    />
                    <button type="submit" className="login-button">Se connecter</button>
                </form>
            </div>
        );
    }

    // ---------------------- Interface du chat ----------------------

    return (
        <div className="chat-layout">
            <aside className="sidebar">
                <div className="sidebar-section">
                    <h3 className="sidebar-title">Utilisateurs</h3>
                    <ul className="user-list">
                        <li
                            onClick={() => handleSelectConversation('Master')}
                            className={`user-item ${activeConversation === 'Master' ? 'active' : ''}`}
                        >
                            Groupe Master
                        </li>
                        {Object.values(connectedUsers).map((uname) =>
                            uname !== username && (
                                <li
                                    key={uname}
                                    onClick={() => handleSelectConversation(uname)}
                                    className={`user-item ${activeConversation === uname ? 'active' : ''}`}
                                >
                                    {uname}
                                </li>
                            )
                        )}
                    </ul>
                </div>
            </aside>

            <main className="main-chat">
                <div className="chat-header">
                    <h2 className="chat-title">
                        {activeConversation === 'Master'
                            ? 'Chat Principal : Master'
                            : `Conversation avec ${activeConversation}`}
                    </h2>
                    <button onClick={toggleTheme} className="theme-toggle-button">
                        <i className={`fa ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={toggleTheme} className="theme-toggle-button">
                        <i className={`fa ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
                    </button>
                    <button onClick={handleLogout} className="logout-button">
                        <i className="fa fa-sign-out-alt"></i> Déconnexion
                    </button>
                </div>

                <div className="message-list">
                    {(activeConversation === 'Master'
                        ? masterMessages
                        : privateMessages[activeConversation] || []
                    ).map((msg, index) => (
                        <div
                            key={index}
                            className={`message ${
                                msg.user === username || msg.user === 'Vous'
                                    ? 'sent'
                                    : msg.system
                                    ? 'system'
                                    : 'received'
                            }`}
                        >
                            <div className="contenu-message">
                                {msg.user && <span className="user-name">{msg.user} : </span>}
                                {msg.file ? (
                                    <span className="file-link">
                                        {msg.text}
                                        <a href={msg.file.url} download={msg.file.name}>
                                            {msg.file.name}
                                        </a>
                                    </span>
                                ) : (
                                    <span className="message-text">{msg.text}</span>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-area">
                    <div className="file-upload">
                        <label className="anonymous-checkbox">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                style={{ marginRight: '10px' }}
                            />
                            Anonyme
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="file-input"
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="upload-button"
                        >
                            Joindre un fichier
                        </button>
                    </div>

                    <form onSubmit={handleSendMessage} className="message-input-area">
                        <div className="input-controls">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={`Votre message${activeConversation === 'Master' ? '' : ` à ${activeConversation}`}...`}
                                className="message-input"
                            />
                            <button type="submit" className="send-button">
                                Envoyer
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default Chat;
