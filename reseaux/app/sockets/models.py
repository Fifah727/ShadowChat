from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, LargeBinary, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from db_config import Base

# ✅ Table d'association many-to-many
utilisateurs_groupes = Table(
    "utilisateurs_groupes",
    Base.metadata,
    Column("utilisateur_id", Integer, ForeignKey("utilisateurs.id_utilisateur")),
    Column("groupe_id", Integer, ForeignKey("groupes.id_groupe"))
)

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id_utilisateur = Column(Integer, primary_key=True, index=True)
    nom_utilisateur = Column(String, nullable=False)
    cle_publique = Column(String, nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow)
    
    messages_envoyes = relationship("Message", foreign_keys="[Message.expediteur_id]", back_populates="expediteur")
    messages_recus = relationship("Message", foreign_keys="[Message.destinataire_id]", back_populates="destinataire")
    groupes_administres = relationship("Groupe", back_populates="admin")

    # ✅ Relation many-to-many avec les groupes
    groupes = relationship("Groupe", secondary=utilisateurs_groupes, back_populates="utilisateurs")


class Groupe(Base):
    __tablename__ = "groupes"
    id_groupe = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False, unique=True)
    admin_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"), nullable=True)
    date_creation = Column(DateTime, default=datetime.utcnow)
    est_systeme = Column(Boolean, default=False)

    # ✅ Relation many-to-many avec les utilisateurs
    utilisateurs = relationship("Utilisateur", secondary=utilisateurs_groupes, back_populates="groupes")

    admin = relationship("Utilisateur", back_populates="groupes_administres")
    messages = relationship("Message", back_populates="groupe")


class Message(Base):
    __tablename__ = "messages"
    id_message = Column(Integer, primary_key=True, index=True)
    
    expediteur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    destinataire_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    groupe_id = Column(Integer, ForeignKey("groupes.id_groupe"), nullable=True)
    
    contenu_chiffre = Column(String, nullable=False)
    auto_destruction = Column(Boolean, default=False)
    date_expiration = Column(DateTime, nullable=True)
    date_envoi = Column(DateTime, default=datetime.utcnow)
    lu = Column(Boolean, default=False)
    
    expediteur = relationship("Utilisateur", foreign_keys=[expediteur_id], back_populates="messages_envoyes")
    destinataire = relationship("Utilisateur", foreign_keys=[destinataire_id], back_populates="messages_recus")
    groupe = relationship("Groupe", back_populates="messages")


class Fichiers(Base):
    __tablename__ = 'fichiers'
    id_fichier = Column(Integer, primary_key=True)
    nom_fichier = Column(String, nullable=False)
    contenu_fichier = Column(LargeBinary, nullable=False)
    date_upload = Column(DateTime, default=datetime.utcnow)


class Logs(Base):
    __tablename__ = "logs"
    id_log = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id_utilisateur"))
    type_action = Column(String, nullable=False)
    description_action = Column(String, nullable=False)
    date_action = Column(DateTime, default=datetime.utcnow)
