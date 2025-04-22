from flask import Flask, request, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room
from sqlalchemy.orm import scoped_session
from db_config import engine, SessionLocal
from models import Utilisateur, Message, Fichiers, Logs
import secrets
import os
import base64
from datetime import datetime

# === Initialisation de l'application Flask ===
app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(24)

# === Configuration de Socket.IO ===
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10 * 1024 * 1024)

# === Dossier pour stocker les fichiers reçus ===
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# === Mémoires temporaires ===
users = {}  # Associe les SID aux utilisateurs
messages = {"Master": []}  # Messages dans le salon de groupe

# ========================
#     SOCKET.IO EVENTS
# ======================== https://v.moviebox.ng/MO1vVpRhN69

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
        mdp = data.get('mdp', '').strip()

        print(f"Réception set_username: {username} - {mdp}")

        if not username:
            emit('set_username_failed', 'Nom d\'utilisateur invalide.')
            return

        if session.query(Utilisateur).filter_by(nom_utilisateur=username).first():
            emit('username_taken')
            return

        new_user = Utilisateur(nom_utilisateur=username, cle_publique=mdp)
        session.add(new_user)
        session.commit()

        users[request.sid]['username'] = username
        join_room("Master", sid=request.sid)

        print(f"{username} connecté avec SID : {request.sid}")

        emit('username_set_success', username)
        emit('user_list', {
            sid: user['username'] for sid, user in users.items() if user['username']
        }, broadcast=True)

    except Exception as e:
        session.rollback()
        print(f"Erreur set_username : {e}")
        emit('set_username_failed', 'Erreur du serveur.')
    finally:
        session.close()

@socketio.on('send_message')
def handle_send_message(data):
    session = scoped_session(SessionLocal)
    try:
        room = data.get('room', 'Master')
        message = data.get('message', '').strip()
        sender = users.get(request.sid, {}).get('username', 'Anonyme')

        print(f"[send_message] De: {sender}, Vers: {room}, Message: {message}")

        if not message:
            print("Message vide, ignoré.")
            return

        expediteur = session.query(Utilisateur).filter_by(nom_utilisateur=sender).first()
        destinataire_id = 140

        if room != "Master":
            destinataire = session.query(Utilisateur).filter_by(nom_utilisateur=room).first()
            if not destinataire:
                print(f"Destinataire {room} introuvable.")
                emit('message_error', 'Destinataire inconnu.')
                return
            destinataire_id = destinataire.id_utilisateur

        new_message = Message(
            expediteur_id=expediteur.id_utilisateur if expediteur else None,
            destinataire_id=destinataire_id, #NULL MASTER
            contenu_chiffre=message,
            date_envoi=datetime.utcnow()
        )
        session.add(new_message)
        session.commit()
        
        message_data = {
            'user': sender,
            'text': message,
            'room': room if room == "Master" else None,
            'private': room != "Master"
        }

        if room == "Master":
            emit('receive_message', message_data, broadcast=True, to='Master')
        else:
            recipient_sid = get_sid_by_username(room)
            print(f"SID de {room} : {recipient_sid}")
            if not recipient_sid:
                print(f"SID introuvable pour {room}")
                emit('message_error', f"L'utilisateur {room} n'est pas en ligne.")
                return
            emit('receive_message', message_data, to=recipient_sid)
            emit('receive_message', message_data, to=request.sid)

        print(f"Message de {sender} envoyé à {room} (SID={recipient_sid})")

    except Exception as e:
        session.rollback()
        print(f"Erreur send_message : {e}")
        emit('message_error', 'Erreur du serveur.')
    finally:
        session.close()

@socketio.on('upload_file')
def handle_upload_file(data):
    try:
        filename = data.get('filename')
        filedata = data.get('filedata').split(',')[1]
        room = data.get('room', 'Master')
        sender = users.get(request.sid, {}).get('username', 'Anonyme')

        print(f"Upload fichier par {sender} : {filename} pour {room}")

        if not filename or not filedata:
            emit('file_error', {'error': 'Fichier invalide.'}, to=request.sid)
            return

        filepath = os.path.join(UPLOAD_FOLDER, filename)
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(filedata))

        emit('file_uploaded', {
            'filename': filename,
            'url': f'http://localhost:5001/download/{filename}',
            'sender': sender
        }, broadcast=True, to=room)

    except Exception as e:
        print(f"Erreur upload fichier : {e}")
        emit('file_error', {'error': 'Erreur serveur.'}, to=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    session = scoped_session(SessionLocal)
    try:
        username = users.pop(request.sid, {}).get('username')
        print(f"Déconnexion de : {username}")

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
        print(f"Erreur déconnexion : {e}")
    finally:
        session.close()

# ========================
#        ROUTES HTTP
# ========================

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        return send_file(filepath, as_attachment=True)
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/get_messages', methods=['GET'])
def get_messages():
    session = scoped_session(SessionLocal)
    try:
        room = request.args.get('room', 'Master')
        userA = request.args.get('userA')
        userB = request.args.get('userB')

        if room == 'Master':
            messages_master = session.query(Message).join(
                Utilisateur, Message.expediteur_id == Utilisateur.id_utilisateur
            ).filter(Message.destinataire_id == None).order_by(Message.date_envoi).all()

            return {
                "messages": [{
                    "expediteur": msg.expediteur.nom_utilisateur if msg.expediteur else "Anonyme",
                    "contenu": msg.contenu_chiffre,
                    "date_envoi": msg.date_envoi.strftime('%Y-%m-%d %H:%M:%S')
                } for msg in messages_master]
            }, 200

        elif userA and userB:
            expediteurA = session.query(Utilisateur).filter_by(nom_utilisateur=userA).first()
            destinataireB = session.query(Utilisateur).filter_by(nom_utilisateur=userB).first()

            if not expediteurA or not destinataireB:
                return {"error": "Utilisateur non trouvé."}, 404

            messages_users = session.query(Message).filter(
                ((Message.expediteur_id == expediteurA.id_utilisateur) & (Message.destinataire_id == destinataireB.id_utilisateur)) |
                ((Message.expediteur_id == destinataireB.id_utilisateur) & (Message.destinataire_id == expediteurA.id_utilisateur))
            ).order_by(Message.date_envoi).all()

            return {
                "messages": [{
                    "expediteur": msg.expediteur.nom_utilisateur if msg.expediteur else "Anonyme",
                    "destinataire": msg.destinataire.nom_utilisateur if msg.destinataire else "Master",
                    "contenu": msg.contenu_chiffre,
                    "date_envoi": msg.date_envoi.strftime('%Y-%m-%d %H:%M:%S')
                } for msg in messages_users]
            }, 200

        else:
            return {"error": "Paramètres manquants ou invalides."}, 400

    except Exception as e:
        print(f"Erreur récupération messages : {e}")
        return {"error": "Erreur serveur."}, 500
    finally:
        session.close()

# ========================
#   FONCTIONS UTILITAIRES
# ========================
def get_sid_by_username(username):
    print(f"Recherche SID pour utilisateur : {username}")
    for sid, info in users.items():
        print(f"SID = {sid}, utilisateur = {info.get('username')}")
        if info.get('username') == username:
            return sid
    return None

# ========================
#         LANCEMENT
# ========================
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
