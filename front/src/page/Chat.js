import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MessageForm from '../components/MessageForm';
import MessagesList from '../components/MessagesList';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const utilisateurId = 1;  // À changer dynamiquement selon l'utilisateur connecté

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/recuperer_messages/${utilisateurId}`);
            setMessages(response.data);
        } catch (error) {
            console.error("Erreur lors de la récupération des messages:", error);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    return (
        <div>
            <h2>Chat sécurisé</h2>
            <MessageForm fetchMessages={fetchMessages} />
            <MessagesList messages={messages} />
        </div>
    );
};

export default Chat;
