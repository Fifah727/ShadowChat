# main.py
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from routes import init_routes
from sockets import init_sockets
from database import db

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=100_000_000)

db.init_app(app)
init_routes(app)
init_sockets(socketio)

if __name__ == '__main__':
    socketio.run(app, debug=True)


# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

engine = create_engine('postgresql://username:password@localhost/dbname')
SessionLocal = sessionmaker(bind=engine)
db = scoped_session(SessionLocal)
Base = declarative_base()


# models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Utilisateur(Base):
    __tablename__ = 'utilisateurs'
    id = Column(Integer, primary_key=True)
    nom_utilisateur = Column(String, unique=True, nullable=False)
    cle_publique = Column(String, nullable=False)

class Message(Base):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True)
    contenu = Column(Text)
    sender = Column(String)
    receiver = Column(String)
    date_envoi = Column(DateTime, default=datetime.utcnow)
    room = Column(String)

class Fichier(Base):
    __tablename__ = 'fichiers'
    id = Column(Integer, primary_key=True)
    nom = Column(String)
    type = Column(String)
    taille = Column(Integer)
    room = Column(String)
    chemin = Column(String)

class Log(Base):
    __tablename__ = 'logs'
    id = Column(Integer, primary_key=True)
    username = Column(String)
    action = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)


# utils.py
from werkzeug.security import generate_password_hash, check_password_hash
from flask_socketio import emit
import uuid

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'zip'}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def hash_password(password):
    return generate_password_hash(password)

def verify_password(stored, provided):
    return check_password_hash(stored, provided)

def generate_unique_filename(filename):
    return f"{uuid.uuid4().hex}_{filename}"

def get_sid_by_username(users, username):
    for sid, data in users.items():
        if data['username'] == username:
            return sid
    return None

def broadcast_user_list(users, socketio):
    socketio.emit('user_list', {
        sid: data['username'] for sid, data in users.items() if data['username']
    }, broadcast=True)


# routes.py
from flask import request, send_from_directory
from flask_socketio import emit
import os
from models import Message
from database import db
from flask import Blueprint
from werkzeug.utils import secure_filename
from models import Fichier

uploads_folder = './uploads'

def init_routes(app):
    @app.route('/download/<filename>')
    def download_file(filename):
    # Sécuriser le nom du fichier
    secure_name = secure_filename(filename)

    # Vérifie si le fichier est enregistré dans la base
    fichier = db.query(Fichier).filter_by(nom=secure_name).first()
    if not fichier:
        return "Fichier non trouvé", 404

    return send_from_directory(uploads_folder, secure_name, as_attachment=True)

    @app.route('/get_messages/<room>')
    def get_messages(room):
        messages = db.query(Message).filter_by(room=room).all()
        return [
            {'sender': m.sender, 'receiver': m.receiver, 'contenu': m.contenu, 'date_envoi': m.date_envoi.isoformat()}
            for m in messages
        ]


# sockets.py
from flask_socketio import emit, join_room, leave_room
from models import Utilisateur, Message, Fichier, Log
from database import db
from utils import hash_password, verify_password, generate_unique_filename, get_sid_by_username, broadcast_user_list
import os
from datetime import datetime

users = {}
uploads_folder = './uploads'

if not os.path.exists(uploads_folder):
    os.makedirs(uploads_folder)

def init_sockets(socketio):
    @socketio.on('connect')
    def handle_connect():
        users[request.sid] = {'username': None}

    @socketio.on('disconnect')
    def handle_disconnect():
        user = users.get(request.sid)
        if user and user['username']:
            log = Log(username=user['username'], action='Déconnexion')
            db.add(log)
            db.commit()
        users.pop(request.sid, None)
        broadcast_user_list(users, socketio)

    @socketio.on('login')
    def login(data):
        username, password = data['username'], data['mdp']
        user = db.query(Utilisateur).filter_by(nom_utilisateur=username).first()
        if user and verify_password(user.cle_publique, password):
            users[request.sid]['username'] = username
            log = Log(username=username, action='Connexion')
            db.add(log)
            db.commit()
            broadcast_user_list(users, socketio)
        else:
            emit('login_failed', 'Nom d'utilisateur ou mot de passe incorrect.')

    @socketio.on('register')
    def register(data):
        username, password = data['username'], data['mdp']
        if db.query(Utilisateur).filter_by(nom_utilisateur=username).first():
            emit('register_failed', 'Nom déjà utilisé.')
            return
        user = Utilisateur(nom_utilisateur=username, cle_publique=hash_password(password))
        db.add(user)
        db.commit()

    @socketio.on('send_message')
    def send_message(data):
        sender = users[request.sid]['username']
        receiver, room, contenu = data['receiver'], data['room'], data['contenu']
        msg = Message(contenu=contenu, sender=sender, receiver=receiver, room=room)
        db.add(msg)
        db.commit()
        emit('message', {'sender': sender, 'receiver': receiver, 'contenu': contenu, 'room': room}, room=room)

    @socketio.on('upload_file')
    def upload_file(data):
        filedata = data['file']
        filename = data['name']
        filetype = data['type']
        taille = data['taille']
        room = data['room']

        # Vérification de la taille
        if taille > MAX_FILE_SIZE:
            emit('upload_failed', 'Fichier trop volumineux.')
            return

        # Vérification de l'extension
        if not allowed_file(filename):
            emit('upload_failed', 'Type de fichier non autorisé.')
            return

        # Génération d’un nom unique
        unique_name = generate_unique_filename(filename)
        filepath = os.path.join(uploads_folder, unique_name)

        # Sauvegarde du fichier
        with open(filepath, 'wb') as f:
            f.write(filedata)

        # Enregistrement dans la base
        file = Fichier(nom=filename, type=filetype, taille=taille, room=room, chemin=filepath)
        db.add(file)
        db.commit()

        emit('file_uploaded', {'nom': filename, 'room': room}, room=room)

