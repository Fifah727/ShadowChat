import React, { useState } from 'react';
import axios from 'axios';

const MessageForm = ({ fetchMessages }) => {
    const [contenu, setContenu] = useState('');
    const expediteurId = 1;  // À changer dynamiquement
    const destinataireId = 2;  // À changer dynamiquement

    const envoyerMessage = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/envoyer_message', {
                expediteur_id: expediteurId,
                destinataire_id: destinataireId,
                contenu_chiffre: contenu
            });
            setContenu('');
            fetchMessages();
        } catch (error) {
            console.error("Erreur lors de l'envoi du message:", error);
        }
    };

    return (
        <form onSubmit={envoyerMessage}>
            <input type="text" value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Écrire un message..." />
            <button type="submit">Envoyer</button>
        </form>
    );
};

export default MessageForm;
