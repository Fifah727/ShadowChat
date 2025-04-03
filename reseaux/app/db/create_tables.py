# Appeler cette foncion pour creer les Tables dans PosgreSQ
# avec python -m app.db.create_tables

from app.db.db_config import engine
from app.db.models import Base

def create_tables():
    print("✅ Création des tables dans la base de données...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées avec succès.")

if __name__ == "__main__":
    create_tables()
