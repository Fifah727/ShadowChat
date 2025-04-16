# # CONFIG DE CONNEXION A BD
# # travaillez sur un projet de messagerie avec des modèles complexes 
# # (utilisateurs, groupes, messages, fichiers) 
# # et possiblement des relations multiples entre les tables, SQLAlchemy avec Base, engine, et SessionLocal


# from sqlalchemy import create_engine
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker
# import os
# from dotenv import load_dotenv

# # Charger les variables d'environnement
# load_dotenv()

# # URL de connexion à la base de données
# DATABASE_URL = os.getenv("DATABASE_URL")  # Exemple : "postgresql://user:password@localhost/db_name"

# # Moteur de connexion
# engine = create_engine(DATABASE_URL)

# # Configuration des sessions
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# # Base déclarative
# Base = declarative_base()



from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

DATABASE_URL = "postgresql://postgres:123456789FS@localhost:5432/messageReseau"   # Remplacez avec l'URL de votre base réelle

Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

