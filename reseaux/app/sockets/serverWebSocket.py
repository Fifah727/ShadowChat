import asyncio
import websockets

async def echo(websocket, path):
    print("Connexion établie.")
    try:
        async for message in websocket:
            print(f"Message reçu : {message}")
            await websocket.send(f"Echo : {message}")
    except websockets.ConnectionClosedError as e:
        print(f"Erreur de connexion côté serveur : {e}")
    except Exception as e:
        print(f"Erreur inattendue : {e}")
    finally:
        print("Fin de connexion.")

async def main():
    # Créez et démarrez le serveur WebSocket
    server = await websockets.serve(echo, "127.0.0.1", 12345)
    print("✅ Serveur WebSocket démarré sur ws://127.0.0.1:12345")
    await server.wait_closed()  # Maintenir le serveur actif

if __name__ == "__main__":
    # Utilisez asyncio.run() pour démarrer la boucle d'événements
    asyncio.run(main())
