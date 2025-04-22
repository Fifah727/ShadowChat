from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime
from db_config import Base

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id_utilisateur = Column(Integer, primary_key=True, index=True)
    nom_utilisateur = Column(String, nullable=False)
    cle_publique = Column(String, nullable=True)
    mode_anonyme = Column(Boolean, default=False)
    date_creation = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id_message = Column(Integer, primary_key=True, index=True)
    expediteur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    destinataire_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    contenu_chiffre = Column(String, nullable=False)
    auto_destruction = Column(Boolean, default=False)
    date_expiration = Column(DateTime, nullable=True)
    date_envoi = Column(DateTime, default=datetime.utcnow)

class Fichiers(Base):
    __tablename__ = 'fichiers'
    id_fichier = Column(Integer, primary_key=True)
    nom_fichier = Column(String, nullable=False)
    contenu_fichier = Column(LargeBinary, nullable=False)  # Utilisation correcte de LargeBinary
    date_upload = Column(DateTime, default=datetime.utcnow)

class Logs(Base):
    __tablename__ = "logs"
    id_log = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    type_action = Column(String, nullable=False)
    description_action = Column(String, nullable=False)
    date_action = Column(DateTime, default=datetime.utcnow)
