# sockets.py
from flask import request
from flask_socketio import emit, join_room, leave_room
from sqlalchemy.orm import scoped_session
from datetime import datetime
from models import Utilisateur, Logs, Message
from utils import get_sid_by_username, get_connected_users, get_connected_usernames
from db_config import SessionLocal

import os
import base64

UPLOAD_FOLDER = 'uploads'
users = {}  # Global users connected

def init_socket_events(socketio):

    @socketio.on('connect')
    def handle_connect():
        users[request.sid] = {'username': None}
        print(f"Client connecté : {request.sid}")
        
    
    @socketio.on('set_username')
    def handle_set_username(data):
        session = scoped_session(SessionLocal)
        try:
            username = data.get('username', '').strip()
            mdp = data.get('mdp', '').strip()

            if not username:
                emit('set_username_failed', 'Nom d\'utilisateur invalide.')
                return

            if session.query(Utilisateur).filter_by(nom_utilisateur=username).first():
                emit('username_taken')
                return

            new_user = Utilisateur(nom_utilisateur=username, cle_publique=mdp)
            session.add(new_user)
            session.commit()

            emit('username_set_success', username)
            
            
            
        except Exception as e:
            session.rollback()
            print(f"Erreur set_username : {e}")
            emit('set_username_failed', 'Erreur du serveur.')
        finally:
            session.close()

    @socketio.on('login')
    def login(data):
        session = scoped_session(SessionLocal)
        try:
            username = data.get('username', '').strip()
            mdp = data.get('mdp', '').strip()

            utilisateur = session.query(Utilisateur).filter_by(nom_utilisateur=username).first()

            if utilisateur is None:
                emit('not_registered')
                return

            if utilisateur.cle_publique != mdp:
                emit('mdp_false')
                return

            # ajouter dans la liste des users connectés dans : users = {}
            users[request.sid]['username'] = username
            join_room("Master", sid=request.sid)

            log = Logs(
                utilisateur_id=utilisateur.id_utilisateur,
                type_action="Connexion",
                description_action=f"Utilisateur {username} connecté",
                date_action=datetime.utcnow()
            )
            session.add(log)
            session.commit()

            # envoyer la liste des users et status
            all_users = session.query(Utilisateur).all()
            result = []
            connected_usernames = get_connected_usernames(users)
            for user in all_users:
                result.append({
                    "username": user.nom_utilisateur,
                    "connecté": user.nom_utilisateur in connected_usernames
                })
            
            # envoyer les resultats
            emit('connected', {
                'session_id': request.sid,
                'username': username,
                'all_users' : result
            })
            
            # signaler les autres qu'un user s'est connecté
            emit('user_connected', {
                "user": "Master",
                "text": username+" s'est connecté",
                "system":"system"
            }, broadcast=True)
           

        except Exception as e:
            session.rollback()
            print(f"Erreur de connexion : {e}")
            emit('login_server_failed', 'Erreur du serveur.')
        finally:
            session.close()

    # DANS LA PAGE MESSAGE.JS
    @socketio.on('reconnect_user')
    def handle_reconnect_user(data):
        username = data.get('username','inconnu')
        if not username:
            emit('reconnect_failed', 'Nom d\'utilisateur manquant.')
            return

        # Rebrancher le username au SID actuel
        users[request.sid] = {'username': username}

        join_room("Master", sid=request.sid)
        print(f"[RECONNECT] {username} reconnecté avec SID : {request.sid}")

        # envoyer la liste des users et status
        session = scoped_session(SessionLocal)
        all_users = session.query(Utilisateur).all()
        result = []
        connected_usernames = get_connected_usernames(users)
        for user in all_users:
            result.append({
                "username": user.nom_utilisateur,
                "connecté": user.nom_utilisateur in connected_usernames
            })        
        # envoyer les resultats
        emit('reconnect_success', {
            'session_id': request.sid,
            'username': username,
            'all_users' : result
        })
      
    # BROADCAST
    @socketio.on('send_message')
    def handle_send_message(data):
        session = scoped_session(SessionLocal)
        try:
            username = data.get('username', '').strip()
            message = data.get('message', '').strip()

            expediteur = session.query(Utilisateur).filter_by(nom_utilisateur=username).first()

            new_message = Message(
                expediteur_id=expediteur.id_utilisateur if expediteur else None,
                destinataire_id=None,
                contenu_chiffre=message,
                date_envoi=datetime.utcnow()
            )
            session.add(new_message)
            session.commit()

            # BROADCAST
            emit("receive_message", {
                "user": username,
                "text": message
            }, broadcast=True)

        except Exception as e:
            session.rollback()
            print(f"Erreur send_message : {e}")
            emit('message_error', 'Erreur du serveur.')
        finally:
            session.close()

    # PRIVATE
    @socketio.on('send_private_message')
    def handle_send_private_message(data):
        session = scoped_session(SessionLocal)
        try:
            username = data.get('username', '').strip()
            message = data.get('message', '').strip()
            destinataire_pseudo = data.get('destinataire', '').strip()

            expediteur = session.query(Utilisateur).filter_by(nom_utilisateur=username).first()
            destinataire_bd = session.query(Utilisateur).filter_by(nom_utilisateur=destinataire_pseudo).first()
            destinataire_sid = get_sid_by_username(users,destinataire_pseudo)

            new_message = Message(
                expediteur_id=expediteur.id_utilisateur if expediteur else None,
                destinataire_id=destinataire_bd.id_utilisateur if destinataire_bd else None,
                contenu_chiffre=message,
                date_envoi=datetime.utcnow()
            )
            session.add(new_message)
            session.commit()

            # PRIVATE : se dirige vers le destinataire
            emit("receive_private_message", {
                "user": username,
                "text": message,
                "destinataire":destinataire_pseudo
            },to=destinataire_sid)

        except Exception as e:
            session.rollback()
            print(f"Erreur send_private_message : {e}")
            emit('message_private_error', 'Erreur du serveur.')
        finally:
            session.close()


    @socketio.on('upload_file')
    def handle_upload_file(data):
        try:
            filename = data.get('filename')
            filedata = data.get('filedata').split(',')[1]
            room = data.get('room', 'Master')
            sender = users.get(request.sid, {}).get('username', 'Anonyme')

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
                        type_action="Déconnexion",
                        description_action=f"Utilisateur {username} déconnecté",
                        date_action=datetime.utcnow()
                    )
                    session.add(log)
                    session.commit()

                emit('user_disconnected', {
                    "user": "Master",
                    "text": username+" s'est déconnecté",
                    "system":"system"
                }, broadcast=True)
                
        except Exception as e:
            session.rollback()
            print(f"Erreur déconnexion : {e}")
        finally:
            session.close()

    @socketio.on('get_all_users_status')
    def handle_get_all_users_status():
        session = scoped_session(SessionLocal)
        try:
            all_users = session.query(Utilisateur).all()
            result = []
            
            connected_usernames = get_connected_usernames(users)

            for user in all_users:
                result.append({
                    "username": user.nom_utilisateur,
                    "connecté": user.nom_utilisateur in connected_usernames
                })
                
            #  envoyer la listes des users avec leur status 
            emit('all_users_status', result, to=request.sid)

        except Exception as e:
            print(f"Erreur récupération statut utilisateurs : {e}")
            emit('status_error', 'Erreur serveur.')
        finally:
            session.close()
