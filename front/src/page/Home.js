import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
    return (
        <div>
            <h1>Bienvenue sur l'application de messagerie sécurisée</h1>
            <Link to="/chat">Accéder au chat</Link>
            
        </div>
    );
};

export default Home;
