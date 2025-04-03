import socket
import threading

HOST = '0.0.0.0'
PORT = 12345

clients = {}  # Dictionnaire pour stocker les clients {id_client: socket}
groups = {}   # Dictionnaire pour stocker les groupes {nom_groupe: [id_clients]}

def handle_client(client_socket, client_id):
    while True:
        try:
            message = client_socket.recv(1024).decode('utf-8').strip()
            if not message:
                break

            print(f"Message reçu de {client_id}: {message}")

            # Création d'un groupe : "@create nom_groupe"
            if message.startswith("@create"):
                group_name = message.split(" ", 1)[1]
                if group_name not in groups:
                    groups[group_name] = [client_id]
                    client_socket.send(f"✅ Groupe '{group_name}' créé avec succès.".encode('utf-8'))
                else:
                    client_socket.send(f"⚠️ Le groupe '{group_name}' existe déjà.".encode('utf-8'))

            # Ajout d'un membre : "@add nom_groupe id_client"
            elif message.startswith("@add"):
                _, group_name, new_member_id = message.split(" ")
                if group_name in groups and client_id in groups[group_name]:
                    if new_member_id in clients and new_member_id not in groups[group_name]:
                        groups[group_name].append(new_member_id)
                        clients[new_member_id].send(f"✅ Vous avez été ajouté au groupe '{group_name}' par {client_id}.".encode('utf-8'))
                    else:
                        client_socket.send("⚠️ ID invalide ou déjà membre.".encode('utf-8'))
                else:
                    client_socket.send("❌ Vous n'avez pas les droits ou le groupe n'existe pas.".encode('utf-8'))

            # Suppression d'un membre : "@remove nom_groupe id_client"
            elif message.startswith("@remove"):
                _, group_name, member_id = message.split(" ")
                if group_name in groups and client_id in groups[group_name]:
                    if member_id in groups[group_name]:
                        groups[group_name].remove(member_id)
                        clients[member_id].send(f"❌ Vous avez été retiré du groupe '{group_name}'.".encode('utf-8'))
                    else:
                        client_socket.send("⚠️ ID non membre du groupe.".encode('utf-8'))
                else:
                    client_socket.send("❌ Vous n'avez pas les droits ou le groupe n'existe pas.".encode('utf-8'))

            # Suppression d'un groupe : "@delete nom_groupe"
            elif message.startswith("@delete"):
                group_name = message.split(" ", 1)[1]
                if group_name in groups and client_id in groups[group_name]:
                    del groups[group_name]
                    client_socket.send(f"✅ Groupe '{group_name}' supprimé avec succès.".encode('utf-8'))
                else:
                    client_socket.send("❌ Vous n'avez pas les droits ou le groupe n'existe pas.".encode('utf-8'))

            # Envoi de message à un groupe : "@group nom_groupe Message"
            elif message.startswith("@group"):
                group_name, msg_content = message.split(" ", 2)[1:]
                if group_name in groups and client_id in groups[group_name]:
                    for member_id in groups[group_name]:
                        if member_id != client_id:
                            clients[member_id].send(f"[📢 Message de {client_id} dans '{group_name}']: {msg_content}".encode('utf-8'))
                else:
                    client_socket.send("❌ Vous n'avez pas les droits ou le groupe n'existe pas.".encode('utf-8'))

            # Envoi ciblé : "@id_client Message"
            elif message.startswith("@") and " " in message:
                target_id, msg_content = message.split(" ", 1)
                target_id = target_id[1:]  # Supprimer '@'

                if target_id in clients:
                    clients[target_id].send(f"💬 Message de {client_id}: {msg_content}".encode('utf-8'))
                else:
                    client_socket.send("❌ Utilisateur non trouvé.".encode('utf-8'))

            # Diffusion globale : "* Message"
            elif message.startswith("*"):
                msg_content = message[1:]  # Supprimer '*'
                if len(clients) > 1:
                    for target_socket in clients.values():
                        if target_socket != client_socket:
                            target_socket.send(f"[🔊 Diffusion de {client_id}]: {msg_content}".encode('utf-8'))
                else:
                    client_socket.send("⚠️ Aucun autre utilisateur connecté.".encode('utf-8'))

            else:
                client_socket.send("⚠️ Commande non reconnue. Veuillez vérifier les instructions.".encode('utf-8'))

        except:
            break

    # Supprimer le client de la liste et fermer la connexion
    del clients[client_id]
    client_socket.close()

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen(10)  # Accepter plusieurs clients

print(f"✅ Serveur démarré sur {HOST}:{PORT} - En attente de connexions...")

while True:
    client_socket, addr = server.accept()
    
    # Attribution d’un ID unique au client
    client_id = str(len(clients) + 1)
    clients[client_id] = client_socket

    print(f"🔗 Client {client_id} connecté: {addr}")
    client_socket.send(f"🆔 Votre ID est: {client_id}".encode('utf-8'))

    # Lancer un thread pour gérer ce client
    thread = threading.Thread(target=handle_client, args=(client_socket, client_id))
    thread.start()
