import React from "react";
import "./Exemple.css";

const Exemple = () => {
  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>ShadowChat</h2>
        <ul>
          <li className="active">John</li>
          <li>Lisa</li>
          <li>Carlos</li>
          <li>Fatima</li>
        </ul>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <h3>Groupe Master</h3>
        </div>

        <div className="chat-messages">
          <div className="message received">
            <div className="bubble">Salut tout le monde ! 👋</div>
            <span className="timestamp">14:32</span>
          </div>
          <div className="message sent">
            <div className="bubble">Hey ! Bienvenue dans le groupe 🔥</div>
            <span className="timestamp">14:33</span>
          </div>
        </div>

        <div className="chat-input">
          <input type="text" placeholder="Tape ton message..." />
          <button>Envoyer</button>
        </div>
      </div>
    </div>
  );
};

export default Exemple;
