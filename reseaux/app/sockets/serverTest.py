from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

clients = {}  # Stocke les ID des clients connectés

@socketio.on("connect")
def handle_connect():
    emit("welcome", "✅ Connecté au serveur WebSocket")

@socketio.on("register")
def register(data):
    client_id = data["client_id"]
    clients[client_id] = request.sid
    emit("info", f"👤 Client {client_id} enregistré.")

@socketio.on("send_message")
def send_message(data):
    recipient_id = data["recipient_id"]
    message = data["message"]
    sender_id = data["sender_id"]

    if recipient_id in clients:
        emit("receive_message", f"{sender_id}: {message}", room=clients[recipient_id])
    else:
        emit("error", "❌ Destinataire non trouvé.", room=clients[sender_id])

if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=5000, debug=True)
