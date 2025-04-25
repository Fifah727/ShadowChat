import React, { useState, useEffect, useRef,useContext  } from 'react';
import io from 'socket.io-client';
import '../icon/fontawesome-free-6.5.1-web/css/fontawesome.min.css';
import '../icon/fontawesome-free-6.5.1-web/css/all.min.css';
import '../styles/Login.css';
import SocketContext from '../context/SocketContext';

function Message() {
    const [message, setMessage] = useState('');
    const [masterMessages, setMasterMessages] = useState([]);
    const [privateMessages, setPrivateMessages] = useState({});
    const [connectedUsers, setConnectedUsers] = useState({});
    const [activeConversation, setActiveConversation] = useState('Master');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [theme, setTheme] = useState('light');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const username = localStorage.getItem('username');
    const socket = useContext(SocketContext); // socket via context

    // Appel une seule fois au début
    useEffect(() => {
        
        if (!socket) return;

        socket.emit('reconnect_user', { username });

        socket.on('reconnect_success', (data) => {
            console.log("Reconnexion réussie en tant que :", data.username);
            const usernames = data.all_users
                .filter(user => user.connecté === true)
                .map(user => user.username);
            setConnectedUsers(usernames);
        });

        socket.on('reconnect_failed', (error) => {
            console.error("Accès refusé :", error);
            window.location.href = "/login";
        });

        socket.on('receive_message', (msg) => {
            setMasterMessages((prev) => [...prev, msg]);
        });

        socket.on('receive_private_message', (msg) => {
            setPrivateMessages((prev) => ({
                ...prev,
                [msg.user]: [...(prev[msg.user] || []), msg],
            }));
        });

        socket.on('user_disconnected', (msg) => {
            setMasterMessages((prev) => [...prev, msg]);
        });

        socket.on('user_connected', (msg) => {
            setMasterMessages((prev) => [...prev, msg]);
        });

        return () => {
            socket.off('reconnect_success');
            socket.off('reconnect_failed');
            socket.off('receive_message');
            socket.off('receive_private_message');
            socket.off('user_disconnected');
            socket.off('user_connected');
        };
    }, [socket, username]);

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

    // BROADCAST et PRIVE
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && socket) {
            const content = message.trim();
            if (activeConversation === "Master") {
                socket.emit('send_message', {
                    username: username,
                    message: content,
                });
            } else {
                socket.emit('send_private_message', {
                    username: username,
                    message: content,
                    destinataire: activeConversation
                });
                setPrivateMessages((prev) => ({
                    ...prev,
                    [activeConversation]: [
                        ...(prev[activeConversation] || []),
                        { user: 'Vous', text: content },
                    ],
                }));
            }
            setMessage('');
        }
    };

    const handleSelectConversation = (conversation) => {
        // get my conversations
        setActiveConversation(conversation);
    };

    // DECONNEXION
    const handleLogout = () => {
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem("username");
        window.location.href = "/login";
    };


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && socket) {
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
                socket.emit('upload_file', payload);
            };
            reader.readAsDataURL(file);
            e.target.value = null;
        }
    };
    

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
                        <li  className="logout-button" onClick={handleLogout}> 
                        <i className="fa fa-sign-out-alt"></i> Déconnexion
                        </li>
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

export default Message;
