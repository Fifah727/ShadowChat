import React, { useState } from 'react';
import axios from 'axios';

const Login = () => {
    const [nomUtilisateur, setNomUtilisateur] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/login', {
                nom_utilisateur: nomUtilisateur
            });
            alert(response.data.message);
        } catch (error) {
            alert(error.response.data.error);
        }
    };

    return (
        <div>
            <h2>Connexion</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Nom d'utilisateur" value={nomUtilisateur} onChange={(e) => setNomUtilisateur(e.target.value)} required />
                <button type="submit">Se connecter</button>
            </form>
        </div>
    );
};

export default Login;
