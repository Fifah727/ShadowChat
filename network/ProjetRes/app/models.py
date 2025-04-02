from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

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
