// src/context/SocketContext.js
import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Connexion au serveur Socket.IO (ajuste l'URL si besoin)
let socket;

// Création du contexte
const SocketContext = createContext();

// Fournisseur de contexte
export const SocketProvider = ({ children }) => {
    const [socketInstance, setSocketInstance] = useState(null);

    useEffect(() => {
        // On vérifie si une connexion existe déjà
        if (!socket) {
            socket = io('http://localhost:5001', {
                transports: ['websocket'],
                autoConnect: true, // Pour connecter automatiquement
                forceNew: true, // Ne pas réutiliser la connexion précédente
            });
        }

        setSocketInstance(socket);

        // Cleanup lors de la déconnexion du composant
        return () => {
            // Ne pas déconnecter le socket lors du nettoyage pour le garder ouvert
            // socket.disconnect(); // À ne pas décommenter
        };
    }, []);

    return (
        <SocketContext.Provider value={socketInstance}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
