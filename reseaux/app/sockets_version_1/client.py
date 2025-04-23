import socket
import threading

HOST = '127.0.0.1'  # Server IP address
PORT = 12345        # Server port

# Function to receive messages from the server
def receive_messages(client_socket):
    while True:
        try:
            message = client_socket.recv(1024).decode('utf-8')
            if message:
                print(f"\n{message}")
            else:
                break
        except:
            print("❌ Déconnecté.")
            break

def main():
    # Create a socket connection to the server
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        client_socket.connect((HOST, PORT))
        print("✅ Connecté.")
    except:
        print("❌ Erreur lors de la connexion au serveur.")
        return

    # Receive and display the client ID assigned by the server
    client_id = client_socket.recv(1024).decode('utf-8')
    print(f"{client_id}")

    # Launch a thread to receive messages from the server
    thread = threading.Thread(target=receive_messages, args=(client_socket,))
    thread.start()

    # Loop to send messages or interact with groups
    while True:
        print("\n ------------------------------------------------------------------------------- ")
        print("\nCommandes disponibles :")
        print("1️⃣ @id Message - Envoyer un message direct à un utilisateur spécifique.")
        print("2️⃣ * Message - Diffuser un message globalement à tous les utilisateurs connectés.")
        print("3️⃣ @create nom_groupe - Créer un nouveau groupe.")
        print("4️⃣ @add nom_groupe id_client - Ajouter un utilisateur à un groupe existant.")
        print("5️⃣ @remove nom_groupe id_client - Retirer un utilisateur d'un groupe.")
        print("6️⃣ @delete nom_groupe - Supprimer un groupe existant.")
        print("7️⃣ @group nom_groupe Message - Envoyer un message à tous les membres d'un groupe.")
        print("8️⃣ quit - Quitter l'application.")
        print("\n ------------------------------------------------------------------------------- ")


        recipient = input("Envoyé à (@id, @group_name, or * pour tout le monde): ").strip()
        if recipient.lower() == 'quit':
            break

        message = input("Votre message: ").strip()
        if not message:
            print("⚠️ Le message ne peut pas être vide.")
            continue

        # Ask if the message should be sent anonymously
        anonymity = input("Anonyme ? (oui/non): ").strip().lower()
        try:
            if anonymity == "oui":
                client_socket.send(f"{recipient} ? {message}".encode("utf-8"))
            else:
                client_socket.send(f"{recipient} {client_id}: {message}".encode("utf-8"))
        except:
            print("❌ Erreur lors de l'envoi du message")
            break

    # Close the connection to the server
    client_socket.close()
    print("❌ Déconnecté.")

if __name__ == "__main__":
    main()
