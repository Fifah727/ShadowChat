# main.py
from flask import Flask
from flask_socketio import SocketIO
from sockets import init_socket_events, users
import secrets
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(24)

socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10 * 1024 * 1024)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

init_socket_events(socketio)  # Enregistrement des événements

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
