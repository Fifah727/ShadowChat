# MODELE DES TABLES
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
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
    __tablename__ = "fichiers"
    id_fichier = Column(Integer, primary_key=True, index=True)
    expediteur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    destinataire_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    nom_fichier = Column(String, nullable=False)
    type_fichier = Column(String, default=False)
    contenu_fichier = Column(String, nullable=True)
    date_transfert = Column(DateTime, default=datetime.utcnow)
    
class Cles_session(Base):
    __tablename__ = "cles_session"
    id_cle_session = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    cle_session = Column(Integer, nullable=False)
    date_expiration = Column(DateTime, default=datetime.utcnow)
    
class Parametres_confidentialites(Base):
    __tablename__ = "parametres_confidentialite"
    id_parametre = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    chiffrement_active = Column(Boolean, default=False)
    auto_destruction_active = Column(Boolean, default=False)
    mode_anonyme_active = Column(Boolean, default=False)
    
class Logs(Base):
    __tablename__ = "logs"
    id_log = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    type_action = Column(String, default=False)
    description_action = Column(String, default=False)
    date_action = Column(DateTime, default=datetime.utcnow)