import asyncio
import websockets

async def test_client():
    uri = "ws://127.0.0.1:12345"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connexion établie avec le serveur.")

            # Envoyer un message au serveur
            message = "Bonjour, serveur !"
            await websocket.send(message)
            print(f"Message envoyé : {message}")

            # Recevoir une réponse du serveur
            response = await websocket.recv()
            print(f"Réponse reçue du serveur : {response}")
    except websockets.ConnectionClosedError as e:
        print(f"Connexion fermée avec erreur côté client : {e}")
    except Exception as e:
        print(f"Une erreur inattendue côté client : {e}")

asyncio.run(test_client())
