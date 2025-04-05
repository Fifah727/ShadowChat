from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import secrets
import os
from datetime import datetime

app = Flask(__name__)
secret_key = secrets.token_hex(24)
app.config['SECRET_KEY'] = secret_key
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=1024 * 1024 * 10)

users = {}
groups = {}
private_rooms = {}
messages = {}

def generate_room_id(prefix='room'):
    return f"{prefix}-{secrets.token_hex(8)}"

def get_connected_users():
    return {sid: user['username'] for sid, user in users.items()}

@socketio.on('connect')
def handle_connect():
    print(f'Client connecté: {request.sid}')
    users[request.sid] = {'username': None, 'private_room': None}
    emit('connected', {'session_id': request.sid})

@socketio.on('set_username')
def handle_set_username(data):
    username = data['username'].strip()
    if username and request.sid in users and users[request.sid]['username'] is None:
        if username in [u['username'] for u in users.values() if u['username']]:
            emit('username_taken')
        else:
            users[request.sid]['username'] = username
            emit('username_set_success', username)
            emit('user_list', get_connected_users(), broadcast=True)
    else:
        emit('set_username_failed', 'Nom d\'utilisateur invalide ou déjà défini.')

@socketio.on('send_message')
def handle_send_message(data):
    room = data.get('room', 'global')
    message = data.get('message', '').strip()
    anonymous = data.get('anonymous', False)
    if message:
        user_data = users.get(request.sid, {})
        sender = "?" if anonymous else user_data.get('username') or "Anonyme"
        timestamp = datetime.now().isoformat()
        new_message = {'user': sender, 'text': message, 'anonymous': anonymous, 'timestamp': timestamp}
        if room not in messages:
            messages[room] = []
        messages[room].append(new_message)
        emit('receive_message', new_message, to=room)

@socketio.on('private_message')
def handle_private_message(data):
    recipient_username = data.get('recipient')
    message = data.get('message', '').strip()
    anonymous = data.get('anonymous', False)
    if message and recipient_username:
        sender_username = users.get(request.sid, {}).get('username')
        recipient_sid = [sid for sid, user in users.items() if user['username'] == recipient_username]
        if sender_username and recipient_sid:
            recipient_sid = recipient_sid[0]
            sorted_ids = tuple(sorted((request.sid, recipient_sid)))
            if sorted_ids not in private_rooms:
                room_id = generate_room_id('private')
                private_rooms[sorted_ids] = room_id
                join_room(room_id, sid=request.sid)
                join_room(room_id, sid=recipient_sid)
            room_id = private_rooms[sorted_ids]
            timestamp = datetime.now().isoformat()
            sender = "?" if anonymous else sender_username or "Anonyme"
            private_message_data = {'user': sender, 'text': f"(Privé) {message}", 'timestamp': timestamp, 'anonymous': anonymous}
            if room_id not in messages:
                messages[room_id] = []
            messages[room_id].append(private_message_data)
            emit('receive_message', private_message_data, to=room_id)

@socketio.on('create_group')
def handle_create_group(group_name):
    if group_name.strip():
        group_id = generate_room_id('group')
        groups[group_id] = {'name': group_name.strip(), 'admin': request.sid, 'members': [request.sid]}
        join_room(group_id)
        emit('group_created', {'id': group_id, 'name': group_name.strip()})
        emit('group_list', get_available_groups(), broadcast=True)
        emit('group_details', {'groupId': group_id, 'admin': users.get(request.sid, {}).get('username')}, to=group_id) # Informer le créateur qu'il est admin

def get_available_groups():
    return [{'id': gid, 'name': g['name']} for gid, g in groups.items()]

@socketio.on('get_groups')
def handle_get_groups():
    emit('group_list', get_available_groups())

@socketio.on('get_group_details')
def handle_get_group_details(group_id):
    if group_id in groups:
        admin_sid = groups[group_id]['admin']
        admin_username = users.get(admin_sid, {}).get('username')
        members_usernames = [users.get(member_sid, {}).get('username') for member_sid in groups[group_id]['members'] if users.get(member_sid, {}).get('username')]
        emit('group_details', {'groupId': group_id, 'admin': admin_username, 'members': members_usernames})
    else:
        emit('group_action_failed', 'Groupe non trouvé.', to=request.sid)

@socketio.on('join_group')
def handle_join_group(group_id):
    if group_id in groups and request.sid not in groups[group_id]['members']:
        join_room(group_id)
        groups[group_id]['members'].append(request.sid)
        emit('joined_group', group_id)
        emit('group_members_updated', {'group_id': group_id, 'members': [users.get(sid, {}).get('username') for sid in groups[group_id]['members']]}, to=group_id)
        # Informer le client des détails du groupe après avoir rejoint
        handle_get_group_details(group_id)
    elif group_id not in groups:
        emit('group_action_failed', 'Le groupe n\'existe pas.', to=request.sid)
    else:
        emit('group_action_failed', 'Vous êtes déjà dans ce groupe.', to=request.sid)

@socketio.on('add_user_to_group')
def handle_add_user_to_group(data):
    group_id = data.get('group_id')
    username_to_add = data.get('username')
    if group_id in groups and groups[group_id]['admin'] == request.sid:
        user_to_add_sid = next((sid for sid, user in users.items() if user['username'] == username_to_add), None)
        if user_to_add_sid:
            if user_to_add_sid not in groups[group_id]['members']:
                join_room(group_id, sid=user_to_add_sid)
                groups[group_id]['members'].append(user_to_add_sid)
                emit('joined_group', group_id, to=user_to_add_sid)
                emit('group_members_updated', {'group_id': group_id, 'members': [users.get(sid, {}).get('username') for sid in groups[group_id]['members']]}, to=group_id)
                # Informer les membres du groupe de la mise à jour des détails
                handle_get_group_details(group_id)
            else:
                emit('group_action_failed', 'Utilisateur déjà dans le groupe.', to=request.sid)
        else:
            emit('group_action_failed', 'Utilisateur non trouvé.', to=request.sid)
    else:
        emit('group_action_failed', 'Vous n\'êtes pas administrateur de ce groupe.', to=request.sid)

@socketio.on('remove_user_from_group')
def handle_remove_user_from_group(data):
    group_id = data.get('group_id')
    username_to_remove = data.get('username')
    if group_id in groups and groups[group_id]['admin'] == request.sid:
        user_to_remove_sid = next((sid for sid, user in users.items() if user['username'] == username_to_remove), None)
        if user_to_remove_sid:
            if user_to_remove_sid in groups[group_id]['members'] and user_to_remove_sid != request.sid:
                leave_room(group_id, sid=user_to_remove_sid)
                groups[group_id]['members'].remove(user_to_remove_sid)
                emit('left_group', group_id, to=user_to_remove_sid)
                emit('group_members_updated', {'group_id': group_id, 'members': [users.get(sid, {}).get('username') for sid in groups[group_id]['members']]}, to=group_id)
                # Informer les membres du groupe de la mise à jour des détails
                handle_get_group_details(group_id)
            elif user_to_remove_sid == request.sid:
                emit('group_action_failed', 'Vous ne pouvez pas vous supprimer de cette manière. Laissez le groupe.', to=request.sid)
            else:
                emit('group_action_failed', 'Utilisateur non trouvé dans le groupe.', to=request.sid)
        else:
            emit('group_action_failed', 'Utilisateur non trouvé.', to=request.sid)
    else:
        emit('group_action_failed', 'Vous n\'êtes pas administrateur de ce groupe.', to=request.sid)

@socketio.on('delete_group')
def handle_delete_group(group_id):
    if group_id in groups and groups[group_id]['admin'] == request.sid:
        del groups[group_id]
        if group_id in messages:  # Vérifier si la clé existe avant de supprimer
            del messages[group_id]
        emit('group_deleted', group_id, broadcast=True)
        emit('group_list', get_available_groups(), broadcast=True)
    else:
        emit('group_action_failed', 'Vous n\'êtes pas administrateur de ce groupe.', to=request.sid)
        
@socketio.on('upload_file')
def handle_upload_file(data):
    filename = data.get('filename')
    filedata = data.get('filedata')
    room = data.get('room', 'global')
    anonymous = data.get('anonymous', False)
    if filename and filedata:
        sender = "?" if anonymous else users.get(request.sid, {}).get('username', 'Anonyme')
        print(f"Fichier reçu: {filename} de {sender} ({len(filedata)} bytes) dans la room {room} (anonyme: {anonymous})")
        emit('receive_file', {'filename': filename, 'user': sender}, to=room)

@socketio.on('disconnect')
def handle_disconnect():
    username = users.pop(request.sid, {}).get('username')
    # Supprimer l'utilisateur des groupes
    for group_id, group_data in list(groups.items()):
        if request.sid in group_data['members']:
            groups[group_id]['members'].remove(request.sid)
            emit('group_members_updated', {'group_id': group_id, 'members': [users.get(sid, {}).get('username') for sid in group_data['members']]}, to=group_id)
            # Si l'admin quitte, on pourrait désigner un nouvel admin ou supprimer le groupe
            if group_data['admin'] == request.sid and group_data['members']:
                groups[group_id]['admin'] = group_data['members'][0] # Nouveau admin arbitraire
                emit('group_details', {'groupId': group_id, 'admin': users.get(group_data['admin'], {}).get('username')}, to=group_id)
            elif not group_data['members']:
                del groups[group_id]
                emit('group_deleted', group_id, broadcast=True)
                emit('group_list', get_available_groups(), broadcast=True)

    if username:
        print(f'Client déconnecté: {username} ({request.sid})')
        emit('user_list', get_connected_users(), broadcast=True)
        emit('user_disconnected', username, broadcast=True)
    else:
        print(f'Client déconnecté: {request.sid}')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)