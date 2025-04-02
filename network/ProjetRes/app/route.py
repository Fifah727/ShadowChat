from flask import Flask, request, jsonify
from database import SessionLocal
from models import Utilisateur, Message

app = Flask(__name__)

@app.route("/utilisateur", methods=["POST"])
def creer_utilisateur():
    data = request.json
    session = SessionLocal()
    nouvel_utilisateur = Utilisateur(
        nom_utilisateur=data["nom_utilisateur"],
        cle_publique=data.get("cle_publique"),
        mode_anonyme=data.get("mode_anonyme", False)
    )
    session.add(nouvel_utilisateur)
    session.commit()
    session.close()
    return jsonify({"message": "Utilisateur créé avec succès !"}), 201
