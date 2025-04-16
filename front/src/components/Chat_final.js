import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io("http://localhost:5001"); // Remplacez par l'URL de votre serveur backend

function Chat() {
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [anonymous, setAnonymous] = useState(false);
  const [users, setUsers] = useState([]);
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    // Événements Socket.IO
    socket.on("connected", (data) => {
      console.log("Connecté au serveur avec ID :", data.session_id);
    });

    socket.on("username_set_success", () => setConnected(true));
    socket.on("user_list", (users) => setUsers(Object.values(users)));

    socket.on("receive_message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on("receive_file", (data) => {
      alert(`Fichier reçu : ${data.filename} de ${data.user}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSetUsername = () => {
    socket.emit("set_username", { username });
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit("send_message", { message, room: "Master", anonymous });
      setMessage("");
    }
  };

  const handleSendPrivateMessage = () => {
    if (message.trim() && privateRecipient.trim()) {
      socket.emit("private_message", { message, recipient: privateRecipient, anonymous });
      setMessage("");
      setPrivateRecipient("");
    }
  };

  const handleFileUpload = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("upload_file", {
          filename: file.name,
          filedata: reader.result,
          room: "Master",
          anonymous,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDisconnect = () => {
    socket.disconnect();
    setConnected(false);
    setUsername("");
    setMessages([]);
    setUsers([]);
  };

  return (
    <div>
      {/* {!connected ? ( */}
        <div>
          <h1>Connexion</h1>
          <input
            type="text"
            placeholder="Entrez votre pseudonyme"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleSetUsername}>Se connecter</button>
        </div>
      {/* ) : ( */}
        <div>
          <h1>Bienvenue sur "Master"</h1>
          <button onClick={handleDisconnect}>Se déconnecter</button>
          <h2>Utilisateurs connectés</h2>
          <ul>
            {users.map((user, index) => (
              <li key={index}>{user}</li>
            ))}
          </ul>
          <h2>Conversation principale</h2>
          <div>
            {messages.map((msg, index) => (
              <div key={index}>
                <strong>{msg.user}</strong> : {msg.text}
              </div>
            ))}
          </div>
          <textarea
            placeholder="Tapez votre message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div>
            <label>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={() => setAnonymous(!anonymous)}
              />
              Anonyme
            </label>
          </div>
          <button onClick={handleSendMessage}>Envoyer</button>
          <h2>Message privé</h2>
          <input
            type="text"
            placeholder="Nom du destinataire"
            value={privateRecipient}
            onChange={(e) => setPrivateRecipient(e.target.value)}
          />
          <button onClick={handleSendPrivateMessage}>Envoyer en privé</button>
          <h2>Envoyer un fichier</h2>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button onClick={handleFileUpload}>Envoyer fichier</button>
        </div>
      {/* )} */}
    </div>
  );
}

export default Chat;
