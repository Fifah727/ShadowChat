from models import Base
from db_config import engine

def create_all_tables():
    Base.metadata.create_all(engine)
    print("Tables créées avec succès.")

if __name__ == "__main__":
    create_all_tables()
