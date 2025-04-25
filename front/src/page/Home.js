import React from "react";
import "../styles/css.css";

const Home = () => {
    return (
        <section id="hero" class="hero section dark-background">
            <img src="st.jpg" alt="font"/>
        
            <div class="container">
                <div id="flot">
                    <a href="/login" class="btn1 btn">Se connecter</a>
                    <a href="/signin" class="btn2 btn">S'inscrire</a>
                </div>
            <h2 >Messagerie privée <br/>et anonyme en<span> <br/>réseau local</span></h2>
            </div>
        </section>
    );
};

export default Home;
