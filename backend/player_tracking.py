"""
Player tracking utilities for RosterRaise.
Generates referral URLs and credits players for orders.
"""
from urllib.parse import urlencode

BASE_URL = "https://rosterraise.com/store"

def generate_player_url(team_subdomain, player_name):
    """
    Generate a tracking URL for a player.
    Returns: 'rosterraise.com/store/TEAMNAME?player=PLAYERNAME'
    """
    params = urlencode({"player": player_name})
    return f"{BASE_URL}/{team_subdomain}?{params}"

def parse_tracking_request(request):
    """
    Extract team_subdomain and player_name from a Flask request object.
    Expected URL pattern: /store/<team_subdomain>?player=<player_name>
    Returns: (team_subdomain, player_name) or (None, None) if missing.
    """
    team_subdomain = None
    player_name = None

    # Try to get team from path
    path = request.path
    if '/store/' in path:
        parts = path.split('/store/')
        if len(parts) > 1:
            team_subdomain = parts[1].split('?')[0].strip('/')

    # Get player from query param
    player_name = request.args.get('player')

    return team_subdomain, player_name

def credit_player(player_id, order_id):
    """
    Mark an order as credited to a player.
    In a real system this would update orders.commission_earned.
    Here we simply return a confirmation dict.
    """
    return {
        "player_id": player_id,
        "order_id": order_id,
        "status": "credited",
        "message": f"Player {player_id} credited for order {order_id}"
    }