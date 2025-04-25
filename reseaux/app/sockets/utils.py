# utils.py

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
