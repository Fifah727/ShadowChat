# utils.py
from models import Utilisateur, Logs, Message, Groupe

def get_sid_by_username(users_dict, username):
    for sid, info in users_dict.items():
        if info.get('username') == username:
            return sid
    return None

def get_connected_users(users_dict):
    return {
        sid: info['username']
        for sid, info in users_dict.items()
        if info['username']
    }
    
def get_connected_usernames(users_dict):
    return set(
        user_info['username']
        for user_info in users_dict.values()
        if user_info['username']  # ignore les SID sans username
    )


def get_groupes_dict(session):
    groupes = session.query(Groupe, Utilisateur.nom_utilisateur)\
        .outerjoin(Utilisateur, Groupe.admin_id == Utilisateur.id_utilisateur)\
        .all()

    return [{
        'id_groupe': g.id_groupe,
        'nom': g.nom,
        'admin_id': g.admin_id,
        'admin_nom': u_nom,  # ici on ajoute le nom de l'admin
        'est_systeme': g.est_systeme,
        'date_creation': g.date_creation.isoformat()
    } for g, u_nom in groupes]
