from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy.orm import scoped_session
from db_config import engine, SessionLocal
from models import Utilisateur, Message, Fichiers, Logs
import secrets
from datetime import datetime

# Initialisation de l'application Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(24)

# Configuration SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10 * 1024 * 1024)

# Mémoire temporaire
users = {}
messages = {"Master": []}

# Gestion des événements SocketIO
@socketio.on('connect')
def handle_connect():
    print(f"Client connecté : {request.sid}")
    users[request.sid] = {'username': None}
    emit('connected', {'session_id': request.sid})

@socketio.on('set_username')
def handle_set_username(data):
    session = scoped_session(SessionLocal)
    try:
        username = data.get('username', '').strip()
        if not username:
            emit('set_username_failed', 'Nom d\'utilisateur invalide.')
            return

        if session.query(Utilisateur).filter_by(nom_utilisateur=username).first():
            emit('username_taken')
            return

        # Ajouter l'utilisateur
        new_user = Utilisateur(nom_utilisateur=username)
        session.add(new_user)
        session.commit()

        users[request.sid]['username'] = username
        join_room("Master", sid=request.sid)
        emit('username_set_success', username)
        emit('user_list', {sid: user['username'] for sid, user in users.items() if user['username']}, broadcast=True)
    except Exception as e:
        session.rollback()
        print(f"Erreur : {e}")
        emit('set_username_failed', 'Erreur du serveur.')
    finally:
        session.close()

@socketio.on('send_message')
def handle_send_message(data):
    session = scoped_session(SessionLocal)
    try:
        room = data.get('room', 'Master')
        message = data.get('message', '').strip()
        user_data = users.get(request.sid, {})
        sender = user_data.get('username', 'Anonyme')

        if message:
            expediteur = session.query(Utilisateur).filter_by(nom_utilisateur=sender).first()
            destinataire = None if room == "Master" else session.query(Utilisateur).filter_by(nom_utilisateur=room).first()

            new_message = Message(
                expediteur_id=expediteur.id_utilisateur if expediteur else None,
                destinataire_id=destinataire.id_utilisateur if destinataire else None,
                contenu_chiffre=message,
                date_envoi=datetime.utcnow()
            )
            session.add(new_message)
            session.commit()

            emit('receive_message', {'user': sender, 'text': message}, broadcast=True, to=room)
    except Exception as e:
        session.rollback()
        print(f"Erreur lors de l'enregistrement du message : {e}")
        emit('message_error', 'Erreur du serveur.')
    finally:
        session.close()

@socketio.on('disconnect')
def handle_disconnect():
    session = scoped_session(SessionLocal)
    try:
        username = users.pop(request.sid, {}).get('username')
        if username:
            user = session.query(Utilisateur).filter_by(nom_utilisateur=username).first()
            if user:
                log = Logs(
                    utilisateur_id=user.id_utilisateur,
                    type_action="déconnexion",
                    description_action=f"Utilisateur {username} déconnecté",
                    date_action=datetime.utcnow()
                )
                session.add(log)
                session.commit()

            emit('user_disconnected', username, broadcast=True)
    except Exception as e:
        session.rollback()
        print(f"Erreur lors de la déconnexion : {e}")
    finally:
        session.close()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
