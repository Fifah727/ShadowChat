import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css'; // Importez votre fichier CSS

function Chat() {
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [isUsernameSet, setIsUsernameSet] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState({});
    const [privateRecipient, setPrivateRecipient] = useState('');
    const [isPrivateMessage, setIsPrivateMessage] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [groups, setGroups] = useState([]);
    const [currentGroup, setCurrentGroup] = useState('global');
    const [newGroupName, setNewGroupName] = useState('');
    const [groupMembers, setGroupMembers] = useState([]);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [showGroupOptions, setShowGroupOptions] = useState(false);
    const [userToAdd, setUserToAdd] = useState('');
    const [userToRemove, setUserToRemove] = useState('');

    useEffect(() => {
        const newSocket = io('http://localhost:5001');
        setSocket(newSocket);

        // ... (Vos gestionnaires d'événements socket restent les mêmes) ...

        return () => newSocket.disconnect();
    }, [setSocket]);

    useEffect(() => {
        if (socket) {
            socket.emit('get_groups');
        }
    }, [socket]);

    useEffect(() => {
        if (socket && isUsernameSet) {
            socket.emit('get_user_list');
        }
    }, [socket, isUsernameSet]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (username.trim() && socket) {
            socket.emit('set_username', { username: username.trim() });
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && socket) {
            const payload = {
                message: message.trim(),
                room: currentGroup,
                anonymous: isAnonymous
            };
            if (isPrivateMessage && privateRecipient) {
                socket.emit('private_message', { recipient: privateRecipient, message: message.trim(), anonymous: isAnonymous });
                setIsPrivateMessage(false);
                setPrivateRecipient('');
            } else {
                socket.emit('send_message', payload);
            }
            setMessage('');
        }
    };

    const handlePrivateMessageClick = (recipient) => {
        setIsPrivateMessage(true);
        setPrivateRecipient(recipient);
        setCurrentGroup('private-' + [username, recipient].sort().join('-'));
    };

    const handleCreateGroupSubmit = (e) => {
        e.preventDefault();
        if (newGroupName.trim() && socket) {
            socket.emit('create_group', newGroupName.trim());
            setNewGroupName('');
            setShowGroupOptions(false);
        }
    };

    const handleJoinGroup = (groupId) => {
        if (socket) {
            socket.emit('join_group', groupId);
            setMessages([]);
        }
    };

    const handleGroupOptionsToggle = () => {
        setShowGroupOptions(!showGroupOptions);
    };

    const handleAddUserToGroup = (e) => {
        e.preventDefault();
        if (socket && currentGroup !== 'global' && userToAdd.trim()) {
            socket.emit('add_user_to_group', { group_id: currentGroup, username: userToAdd.trim() });
            setUserToAdd('');
        }
    };

    const handleRemoveUserFromGroup = (e) => {
        e.preventDefault();
        if (socket && currentGroup !== 'global' && userToRemove.trim()) {
            socket.emit('remove_user_from_group', { group_id: currentGroup, username: userToRemove.trim() });
            setUserToRemove('');
        }
    };

    const handleDeleteGroup = () => {
        if (socket && currentGroup !== 'global' && window.confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
            socket.emit('delete_group', currentGroup);
            setCurrentGroup('global');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && socket) {
            const reader = new FileReader();
            reader.onload = (event) => {
                socket.emit('upload_file', { filename: file.name, filedata: event.target.result, room: currentGroup, anonymous: isAnonymous });
            };
            reader.readAsDataURL(file);
            e.target.value = null;
        }
    };

    if (!isUsernameSet) {
        return (
            <div className="login-container">
                <h2>Bienvenue sur ShadowChat</h2>
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
                    <h3>Utilisateurs connectés</h3>
                    <ul className="user-list">
                        {Object.values(connectedUsers).map(uname => (
                            <li key={uname} className="user-item">
                                <span className="username">{uname}</span>
                                {uname !== username && <button onClick={() => handlePrivateMessageClick(uname)} className="private-button">MP</button>}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="sidebar-section">
                    <h3>Groupes</h3>
                    <ul className="group-list">
                        <li key="global" className={`group-item ${currentGroup === 'global' ? 'active' : ''}`} onClick={() => { setCurrentGroup('global'); setMessages([]); }}>
                            <button className="group-button">Général</button>
                        </li>
                        {groups.map(group => (
                            <li key={group.id} className={`group-item ${currentGroup === group.id ? 'active' : ''}`}>
                                <button className="group-button" onClick={() => handleJoinGroup(group.id)}>
                                    {group.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button onClick={handleGroupOptionsToggle} className="group-options-button">Options de groupe</button>
                    {showGroupOptions && (
                        <div className="group-options-panel">
                            <h4>Créer un groupe</h4>
                            <form onSubmit={handleCreateGroupSubmit} className="create-group-form">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Nom du groupe"
                                    className="group-input"
                                />
                                <button type="submit" className="group-action-button">Créer</button>
                            </form>

                            {currentGroup !== 'global' && (
                                <div className="manage-group">
                                    <h4>Gérer le groupe {groups.find(g => g.id === currentGroup)?.name}</h4>
                                    <div className="add-user">
                                        <h5>Ajouter un utilisateur</h5>
                                        <form onSubmit={handleAddUserToGroup}>
                                            <input
                                                type="text"
                                                value={userToAdd}
                                                onChange={(e) => setUserToAdd(e.target.value)}
                                                placeholder="Pseudo à ajouter"
                                                className="group-input"
                                            />
                                            <button type="submit" className="group-action-button">Ajouter</button>
                                        </form>
                                    </div>
                                    <div className="remove-user">
                                        <h5>Supprimer un utilisateur</h5>
                                        <form onSubmit={handleRemoveUserFromGroup}>
                                            <input
                                                type="text"
                                                value={userToRemove}
                                                onChange={(e) => setUserToRemove(e.target.value)}
                                                placeholder="Pseudo à supprimer"
                                                className="group-input"
                                            />
                                            <button type="submit" className="group-action-button">Supprimer</button>
                                        </form>
                                    </div>
                                    <button onClick={handleDeleteGroup} className="delete-group-button">Supprimer le groupe</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            <main className="main-chat">
                <div className="chat-header">
                    <h2>{currentGroup === 'global' ? 'Chat Général' : groups.find(g => g.id === currentGroup)?.name || 'Chat'}</h2>
                    {isPrivateMessage && <h3>Message privé avec {privateRecipient}</h3>}
                </div>
                <div className="message-list">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.user === username ? 'sent' : (msg.system ? 'system' : 'received')}`}>
                            {msg.user && <span className="user">{msg.user}:</span>}
                            <span className="text">{msg.text}</span>
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
                            placeholder={isPrivateMessage ? `Message privé à ${privateRecipient}...` : "Votre message..."}
                            className="message-input"
                        />
                        <button type="submit" disabled={!socket} className="send-button">Envoyer</button>
                    </div>
                    <div className="file-upload">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        <button type="button" onClick={() => fileInputRef.current.click()} disabled={!socket} className="upload-button">
                            Joindre un fichier
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default Chat;