import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:5000");

const Chat = () => {
  const [clientId, setClientId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("welcome", (msg) => console.log(msg));
    socket.on("receive_message", (msg) => setMessages((prev) => [...prev, msg]));

    return () => socket.disconnect();
  }, []);

  const registerClient = () => {
    socket.emit("register", { client_id: clientId });
  };

  const sendMessage = () => {
    socket.emit("send_message", { sender_id: clientId, recipient_id: recipientId, message });
    setMessage("");
  };

  return (
    <div>
      <h2>Chat privé</h2>
      <input
        type="text"
        placeholder="Votre ID"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
      />
      <button onClick={registerClient}>S'enregistrer</button>

      <input
        type="text"
        placeholder="ID du destinataire"
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={sendMessage}>Envoyer</button>

      <div>
        <h3>Messages :</h3>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>
    </div>
  );
};

export default Chat;
