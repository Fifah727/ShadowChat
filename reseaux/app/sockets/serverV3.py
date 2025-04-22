from flask import Flask, request, jsonify
from db_config import SessionLocal, engine
from models import Utilisateur, Base
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# Création des tables
Base.metadata.create_all(bind=engine)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    nom_utilisateur = data.get("nom_utilisateur")
    cle_publique = data.get("cle_publique")  # Peut être une clé de chiffrement publique
    mode_anonyme = data.get("mode_anonyme", False)

    if not nom_utilisateur:
        return jsonify({"error": "Le nom d'utilisateur est requis"}), 400

    session = SessionLocal()
    utilisateur_existant = session.query(Utilisateur).filter_by(nom_utilisateur=nom_utilisateur).first()

    if utilisateur_existant:
        session.close()
        return jsonify({"error": "Cet utilisateur existe déjà"}), 400

    nouvel_utilisateur = Utilisateur(
        nom_utilisateur=nom_utilisateur,
        cle_publique=cle_publique,
        mode_anonyme=mode_anonyme
    )
    session.add(nouvel_utilisateur)
    session.commit()
    session.close()

    return jsonify({"message": "Utilisateur enregistré avec succès"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    nom_utilisateur = data.get("nom_utilisateur")

    if not nom_utilisateur:
        return jsonify({"error": "Le nom d'utilisateur est requis"}), 400

    session = SessionLocal()
    utilisateur = session.query(Utilisateur).filter_by(nom_utilisateur=nom_utilisateur).first()
    session.close()

    if utilisateur:
        return jsonify({"message": "Connexion réussie", "utilisateur": {"id": utilisateur.id_utilisateur, "nom": utilisateur.nom_utilisateur}}), 200
    else:
        return jsonify({"error": "Utilisateur introuvable"}), 404

if __name__ == '__main__':
    app.run(debug=True)
