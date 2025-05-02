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
    const [selfDestructTime, setSelfDestructTime] = useState(0); // en ms


    const username = localStorage.getItem('username');
    const socket = useContext(SocketContext); // socket via context

    // Appel une seule fois au début
    useEffect(() => {
        if (!socket) return;

        const alreadyConnected = sessionStorage.getItem('socket_connected');

        if (!alreadyConnected) {
            socket.emit('reconnect_user', { username });

            socket.on('reconnect_success', (data) => {
                console.log("Reconnexion réussie en tant que :", data.username);
                const usernames = data.all_users
                    .filter(user => user.connecté === true)
                    .map(user => user.username);
                setConnectedUsers(usernames);
                sessionStorage.setItem('socket_connected', 'true'); // Marque comme connecté
            });

            socket.on('reconnect_failed', (error) => {
                console.error("Accès refusé :", error);
                sessionStorage.removeItem('socket_connected'); // Nettoie au cas où
                window.location.href = "/login";
            });
        }else {
            // 🔁 Si on est déjà connecté (ex: refresh), demander la liste des utilisateurs connectés
            socket.emit('get_all_users_status');
        }

        // Ces événements peuvent toujours être écoutés même après refresh
        socket.on('receive_message', (msg) => {
            setMasterMessages((prev) => [...prev, msg]);
        });

        socket.on('receive_private_message', (msg) => {
            setPrivateMessages((prev) => ({
                ...prev,
                [msg.user]: [
                    ...(prev[msg.user] || []),
                    {
                        user: msg.user,
                        text: msg.text,
                        message_id: msg.message_id,  // Ajouter l'ID du message
                        destinataire: msg.destinataire,
                        lu : msg.lu
                    },
                ],
            }));
            console.log(msg);
        });
        
        socket.on('all_users_status', (data) => {
            const usernames = data
                .filter(user => user.connecté === true)
                .map(user => user.username);
            setConnectedUsers(usernames);
        });

        socket.on('user_disconnected', (msg) => {
            setMasterMessages((prev) => [...prev, msg]);
            socket.emit('get_all_users_status');
        });

        socket.on('user_connected', (msg) => {
            setMasterMessages((prev) => [...prev, msg]);
            socket.emit('get_all_users_status');
            
        });

        socket.on('message_marked_read', ({ message_id }) => {
            setPrivateMessages(prev => {
                const updated = { ...prev };
                for (let user in updated) {
                    updated[user] = updated[user].map(msg => {
                        if (msg.message_id === message_id) {
                            return { ...msg, lu: true }; // Ajouter ou mettre à jour la propriété "lu"
                        }
                        return msg;
                    });
                }
                return updated;
            });
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
                    anonymous: isAnonymous,
                });
            } else {
                socket.emit('send_private_message', {
                    username: username,
                    message: content,
                    destinataire: activeConversation,

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

            // detruire ou pas le message
            if (selfDestructTime > 0) {
                setTimeout(() => {
                    if (activeConversation === "Master") {
                        setMasterMessages((prev) => prev.filter((msg) => msg.text !== content));
                    } else {
                        setPrivateMessages((prev) => ({
                            ...prev,
                            [activeConversation]: (prev[activeConversation] || []).filter((msg) => msg.text !== content),
                        }));
                    }
                }, selfDestructTime);
            }
            
        }
    };

    const handleSelectConversation = (conversation) => {
        // marquer les messages comme lus
        if (activeConversation !== 'Master') {
            privateMessages[activeConversation].forEach(msg => {
                if (msg.destinataire === username) {
                    socket.emit('mark_as_read', {
                        message_id: msg.message_id,
                        destinataire: username
                    });
                }
            });
        }
        setActiveConversation(conversation);
    };
    
    // DECONNEXION
    const handleLogout = () => {
        if (socket) {
            socket.disconnect();
        }
        localStorage.removeItem("username");
        window.location.href = "/login";
        sessionStorage.removeItem('socket_connected');
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
                    {/* <h3 className="sidebar-title">Conversations</h3> */}
                    <ul className="user-list">
                        <li className="sidebar-title">Groupe</li>
                        <li
                            onClick={() => handleSelectConversation('Master')}
                            className={`user-item ${activeConversation === 'Master' ? 'active' : ''}`}
                        >
                            Master
                        </li>
                        <li  className="sidebar-button" onClick={handleLogout}>
                        <i className="fa fa-plus"></i> Nouveau</li>
                        {/* <label for="#nomgpe">Nom du groupe</label>
                        <input type='text' id='nomgpe' ></input> */}

                        <li  className="sidebar-title"><i className='fa fa-user'></i> : en ligne</li>
                        {Object.values(connectedUsers).map((uname) =>
                            uname !== username && (
                                <li
                                    key={uname}
                                    onClick={() => handleSelectConversation(uname)}
                                    className={`user-item ${activeConversation === uname ? 'active' : ''}`}
                                >
                                    {uname}
                                    <i className="fa fa-spot">.</i>
                                </li>
                            )
                        )}
                       
                        <li  className="logout-button" onClick={handleLogout}>
                        <i className="fa fa-sign-out-alt"></i> Déconnexion</li>
                    </ul>
                </div>
            </aside>

            <main className="main-chat">
                <div className="chat-header">
                    <h1 className='chat-title'>
                        {activeConversation === 'Master'
                            ? 'MASTER'
                            : `Message privé avec ${activeConversation}`}
                    </h1>
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
                                {/* {msg.lu && msg.destinataire === username && (
                                    <span className="text-xs text-green-500 ml-2">
                                        <i className='fa fa-true'>Lu</i>
                                    </span>

                                )}
                                "{msg.destinataire} - {username}" */}
                            </div>
                           

                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-area">
                    <div className="file-upload">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="file-input"
                            style={{ display: 'none' }}
                        />
                        <label className="anonymous-checkbox"
                            style={{display: activeConversation === 'Master'
                                ? 'block'
                                : 'none'}}
                        >
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                style={{ marginRight: '10px' }}
                            />
                            Anonyme
                        </label>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="upload-button"
                        >
                            Joindre un fichier
                        </button>
                        <label for="#detruire"> Détruire dans :</label>
                        <select
                            id="detruire"
                            className="detruire-button"
                            onChange={(e) => {
                                const value = e.target.value;
                                let delay = 0;
                                if (value === '5 secondes') delay = 5000;
                                else if (value === '30 secondes') delay = 30000;
                                else if (value === '1 minutes') delay = 60000;
                                else delay = 0; // Jamais
                                setSelfDestructTime(delay);
                            }}
                        >
                            <option>Jamais</option>
                            <option>5 secondes</option>
                            <option>30 secondes</option>
                            <option>1 minutes</option>
                        </select>

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

            <aside className="sidebar-right"  style={{display: activeConversation === 'Master'
                                ? 'block'
                                : 'none'}}>
                <div className="sidebar-section">
                    <ul className="user-list">
                        <li className="sidebar-title">Master : gestion</li>
                        <li  className="sidebar-button">
                        <i className="fa fa-minus"></i> Supprimer</li>
                        <li  className="sidebar-button">
                        <i className="fa fa-stop"></i> Suspendre</li>
                        <li  className="sidebar-button">
                        <i className="fa fa-bell-slash"></i> Mettre en sourdine</li>

                        <li  className="sidebar-title">Membres</li>
                        {Object.values(connectedUsers).map((uname) =>
                            uname !== username && (
                                <li
                                    key={uname}
                                    onClick={() => handleSelectConversation(uname)}
                                    className={`user-item ${activeConversation === uname ? 'active' : ''}`}
                                >
                                    {uname}
                                    {/* <i className="fa fa-star"></i> */}
                                    <i className="fa fa-trash"></i>
                                </li>
                            )
                        )}

                    </ul>
                </div>
            </aside>
        </div>
    );
}

export default Message;
