import React, { useState, useContext } from 'react';
import '../icon/fontawesome-free-6.5.1-web/css/fontawesome.min.css';
import '../icon/fontawesome-free-6.5.1-web/css/all.min.css';
import '../styles/Login.css';
import { Alert } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';
import SocketContext from '../context/SocketContext';

const Login = () => {
    const navigate = useNavigate();
    const socket = useContext(SocketContext); // récupère le socket partagé

    const [username, setUsername] = useState('');
    const [mdp, setMdp] = useState('');
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleUsernameSubmit = (e) => {
        e.preventDefault();

        if (!username.trim() || !mdp.trim()) {
            setError("Veuillez remplir tous les champs.");
            return;
        }

        if (socket) {
            // on nettoie les anciens listeners pour éviter les doublons
            socket.off("connected");
            socket.off("mdp_false");
            socket.off("not_registered");
            socket.off("login_server_failed");

            socket.emit('login', {
                username: username.trim(),
                mdp: mdp.trim(),
            });

            socket.once('connected', (data) => {
                console.log('ID session:', data.session_id);
                console.log('Pseudo:', data.username);
                console.log("Liste des users avec statut : ", data.all_users);

                localStorage.setItem('username', data.username);
                socket.emit('join_room', { room: 'Master' });

                setSuccess("Connexion réussie !");
                setError("");

                setTimeout(() => {
                    navigate("/message");
                }, 1000);
            });

            socket.once('mdp_false', () => {
                setError("Mot de passe incorrect !");
                setSuccess("");
            });

            socket.once('not_registered', () => {
                setError("Utilisateur non reconnu. Veuillez vous inscrire !");
                setSuccess("");
            });

            socket.once('login_server_failed', () => {
                setError("Échec de connexion au serveur. Veuillez réessayer plus tard !");
                setSuccess("");
            });
        } else {
            setError("Connexion au serveur non disponible.");
        }
    };

    const goTo = () => {
        window.location.href = "/signin";
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
                <button type="button" className="signin-button" onClick={goTo}>S'inscrire</button>
            </form>
        </div>
    );
};

export default Login;
