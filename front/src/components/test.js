import React, { useState, useEffect } from "react";

function Chat() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:12345");
    ws.onopen = () => ws.send(JSON.stringify({ user_id: "user123" })); // Identifiant utilisateur
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, `${data.from}: ${data.message}`]);
    };
    setSocket(ws);

    return () => ws.close();
  }, []);

  const sendMessage = () => {
    if (socket) {
      socket.send(JSON.stringify({ target_id: "user456", message: input }));
      setInput("");
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Envoyer</button>
    </div>
  );
}

export default Chat;
