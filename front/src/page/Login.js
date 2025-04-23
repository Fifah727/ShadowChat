import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import '../icon/fontawesome-free-6.5.1-web/css/fontawesome.min.css';
import '../icon/fontawesome-free-6.5.1-web/css/all.min.css';
import axios from 'axios';
import '../styles/Chat.css';
import { Form, Button, Card, Alert } from "react-bootstrap";

const Login = () => {
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
            setSuccess("Vous êtes connécté au serveur.");
            setError("");
        });

        newSocket.on('connected', (data) => {
            console.log('ID session:', data.session_id);
            setSuccess("Votre ID de session est : ", data.session_id);
            setError("");
        });

        newSocket.on('login_success', (uname) => {
            // mettre le id dans localStorage

            // //
            setIsUsernameSet(true);
            newSocket.emit('join_room', { room: 'Master' });
            setSuccess("Connexion réussi !");
            setError("");
        });

        newSocket.on('mdp_false', (error) => {
            setError("Mot de passe incorrect!");
            setSuccess("");
        });   

        newSocket.on('not_registered', (error) => {
            setError("Utilisateur non reconnu. Veuillez vous inscrire!");
            setSuccess("");
        });   
        
        newSocket.on('login_server_failed', (error) => {
            setError("Echec de connexion au serveur. Veuillez réessayer plus tard !");
            setSuccess("");
        });   
    };
    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        if (username.trim() && mdp.trim()) {
            if (!socketRef.current) initSocket();
            setTimeout(() => {
                socketRef.current?.emit('login', {
                    username: username.trim(),
                    mdp: mdp.trim(),
                });
            }, 200); // Petit délai pour s'assurer que la connexion est bien prête
        }
    };

    return (
        <div className="login-container">
            <h2 className="login-title">Connectez-vous</h2>
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

export default Login;
