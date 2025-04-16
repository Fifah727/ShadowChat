import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css';

function Chat() {
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState('');
    const [masterMessages, setMasterMessages] = useState([]); // Messages du groupe Master
    const [privateMessages, setPrivateMessages] = useState({}); // Messages privés par utilisateur
    const [username, setUsername] = useState('');
    const [isUsernameSet, setIsUsernameSet] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState({});
    const [activeConversation, setActiveConversation] = useState('Master'); // "Master" par défaut
    const [isAnonymous, setIsAnonymous] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const newSocket = io('http://localhost:5001'); // Adresse de votre serveur backend
        setSocket(newSocket);
    
        newSocket.on('connect', () => {
            console.log('Connexion réussie avec le serveur.');
        });
    
        newSocket.on('connected', (data) => {
            console.log('Mon ID de session:', data.session_id);
        });
    
        // Réception des messages
        newSocket.on('receive_message', (msg) => {
            if (msg.room === 'Master') {
                // Ajout des messages publics dans Master uniquement
                setMasterMessages((prevMessages) => [...prevMessages, msg]);
            } else {
                // Ajout des messages privés uniquement dans la conversation appropriée
                setPrivateMessages((prevMessages) => ({
                    ...prevMessages,
                    [msg.user]: [...(prevMessages[msg.user] || []), msg],
                }));
            }
        });
    
        newSocket.on('user_list', (users) => {
            setConnectedUsers(users);
        });
    
        newSocket.on('username_taken', () => {
            alert('Ce nom d\'utilisateur est déjà pris. Veuillez en choisir un autre.');
        });
    
        newSocket.on('username_set_success', (uname) => {
            setUsername(uname);
            setIsUsernameSet(true);
            newSocket.emit('join_room', { room: 'Master' }); // Rejoindre automatiquement "Master"
        });
    
        newSocket.on('set_username_failed', (error) => {
            alert(error);
        });
    
        return () => newSocket.disconnect(); // Nettoyer la connexion
    }, []);
    

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [masterMessages, privateMessages, activeConversation]);

    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (username.trim() && socket) {
            socket.emit('set_username', { username: username.trim() });
        } else {
            console.error('Socket non initialisé ou nom d\'utilisateur invalide.');
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && socket) {
            const payload = {
                message: message.trim(),
                room: activeConversation === 'Master' ? 'Master' : null,
                anonymous: isAnonymous,
            };

            if (activeConversation !== 'Master') {
                socket.emit('private_message', {
                    recipient: activeConversation,
                    message: message.trim(),
                    anonymous: isAnonymous,
                });
                setPrivateMessages((prevMessages) => ({
                    ...prevMessages,
                    [activeConversation]: [
                        ...(prevMessages[activeConversation] || []),
                        { user: 'Vous', text: message.trim(), system: false },
                    ],
                }));
            } else {
                socket.emit('send_message', payload);
                setMasterMessages((prevMessages) => [
                    ...prevMessages,
                    { user: username, text: message.trim(), system: false },
                ]);
            }

            setMessage(''); // Réinitialiser la zone de texte
        } else {
            console.error('Socket non initialisé ou message vide.');
        }
    };

    const handleSelectConversation = (conversation) => {
        setActiveConversation(conversation); // Définir l'utilisateur ou Master comme conversation active
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && socket) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const filePayload = {
                    filename: file.name,
                    filedata: event.target.result, // Encodage Base64
                    anonymous: isAnonymous,
                };

                if (activeConversation !== 'Master') {
                    filePayload.recipient = activeConversation; // Ajouter le destinataire
                } else {
                    filePayload.room = 'Master'; // Ajouter la room
                }

                socket.emit('upload_file', filePayload); // Émettre l'événement
            };
            reader.readAsDataURL(file);
            e.target.value = null; // Réinitialiser l'entrée de fichier
        } else {
            console.error('Socket non initialisé ou fichier invalide.');
        }
    };

    if (!isUsernameSet) {
        return (
            <div className="login-container">
                <h2 className="login-title">Bienvenue sur ShadowChat</h2>
                <form onSubmit={handleUsernameSubmit} className="login-form">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Entrez votre pseudo"
                        className="login-input"
                    />
                    <button type="submit" className="login-button">Se connecter</button>
                </form>
            </div>
        );
    }
    
    return (
        <div className="chat-layout">
            <aside className="sidebar">
                <div className="sidebar-section">
                    <h3 className="sidebar-title">Conversations</h3>
                    <ul className="user-list">
                        <li
                            onClick={() => handleSelectConversation('Master')}
                            className={`user-item ${activeConversation === 'Master' ? 'active' : ''}`}
                        >
                            Groupe Master
                        </li>
                        {Object.values(connectedUsers).map((uname) => (
                            uname !== username && (
                                <li
                                    key={uname}
                                    onClick={() => handleSelectConversation(uname)}
                                    className={`user-item ${activeConversation === uname ? 'active' : ''}`}
                                >
                                    {uname}
                                </li>
                            )
                        ))}
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
                </div>
                <div className="message-list">
                    {(activeConversation === 'Master'
                        ? masterMessages
                        : privateMessages[activeConversation] || []
                    ).map((msg, index) => (
                        <div
                            key={index}
                            className={`message ${
                                msg.user === username ? 'sent' : msg.system ? 'system' : 'received'
                            }`}
                        >
                            {msg.user && <span className="user-name">{msg.user}:</span>}
                            <span className="message-text">{msg.text}</span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
    
                <form onSubmit={handleSendMessage} className="message-input-area">
                    <div className="input-controls">
                        <label className="anonymous-checkbox">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                            />
                            Anonyme
                        </label>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`Votre message${activeConversation === 'Master' ? '' : ` à ${activeConversation}`}...`}
                            className="message-input"
                        />
                        <button type="submit" disabled={!socket} className="send-button">
                            Envoyer
                        </button>
                    </div>
                    <div className="file-upload">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            disabled={!socket}
                            className="upload-button"
                        >
                            Joindre un fichier
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
    
}
    
export default Chat;