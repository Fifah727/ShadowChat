import React from 'react';

const MessagesList = ({ messages }) => {
    return (
        <div>
            <h3>Messages reçus</h3>
            <ul>
                {messages.map((msg) => (
                    <li key={msg.id_message}>
                        <strong>Expéditeur {msg.expediteur_id}:</strong> {msg.contenu_chiffre}
                        <br />
                        <em>Envoyé le {new Date(msg.date_envoi).toLocaleString()}</em>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MessagesList;
