
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
