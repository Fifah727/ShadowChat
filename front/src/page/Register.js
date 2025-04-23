import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import '../icon/fontawesome-free-6.5.1-web/css/fontawesome.min.css';
import '../icon/fontawesome-free-6.5.1-web/css/all.min.css';
import axios from 'axios';
import '../styles/Chat.css';
import { Form, Button, Card, Alert } from "react-bootstrap";

const Register = () => {
    const [username, setUsername] = useState('');
    const [mdp, setMdp] = useState('');
    const socketRef = useRef(null);
    const [isUsernameSet, setIsUsernameSet] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const initSocket = () => {
        const newSocket = io('http://192.168.137.1:5001');
        socketRef.current = newSocket;

        newSocket.on('connect', () => { // REPONSE DE emit('connect', donnée) dans serverFinal.py
            setSuccess("Vouc êtes connécté au serveur.");
            setError("");
        });

        newSocket.on('connected', (data) => {
            console.log('ID session:', data.session_id);
            setSuccess("Voutre ID de session est : ", data.session_id);
            setError("");
        });

        newSocket.on('username_taken', () => {
            setError("Nom d’utilisateur déjà pris");
            setSuccess("");
        });

        newSocket.on('username_set_success', (uname) => {
            setUsername(uname);
            setIsUsernameSet(true);
            newSocket.emit('join_room', { room: 'Master' });
            setSuccess("Votre pseudo est bien défini !");
            setError("");
            // rediriger vers login
            setTimeout(() => {
                window.location.href = "/login";
            }, 1000);
        });

        newSocket.on('set_username_failed', (error) => {
            setError(error);
            setSuccess("");
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

                {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
                {success && <Alert variant="success" className="mb-3">{success}</Alert>}
                <button type="submit" className="login-button">Se connecter</button>
            </form>
        </div>
    );
};

export default Register;
