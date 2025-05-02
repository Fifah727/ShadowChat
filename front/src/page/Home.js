import React from "react";
import "../styles/Home.css"; // Nouveau nom plus clair

const Home = () => {
    return (
        <section className="hero">
            <div className="hero-overlay"></div>
            <img src="st.jpg" alt="Arrière-plan" className="hero-bg" />
            
            <div className="hero-content">
                <div className="hero-text">
                    <h1>Bienvenue sur <span>ShadowChat</span></h1>
                    <p>La messagerie <strong>privée</strong> et <strong>anonyme</strong> pour vos échanges sur réseau local.</p>
                </div>

                <div className="hero-actions">
                    <a href="/login" className="btn btn-primary">Se connecter</a>
                    <a href="/signin" className="btn btn-outline">Créer un compte</a>
                </div>
            </div>
        </section>
    );
};

export default Home;
