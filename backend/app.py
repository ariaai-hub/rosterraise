"""
Flask application for RosterRaise.
Provides leaderboard, Stripe webhook, and partner payout endpoints.
"""
import os
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify
import stripe

from models import init_db, get_db
from player_tracking import generate_player_url, parse_tracking_request, credit_player
from stripe_integration import (
    create_checkout_session,
    calculate_team_commission,
    calculate_partner_commission,
    schedule_payout,
)

app = Flask(__name__)
app.config['STRIPE_WEBHOOK_SECRET'] = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")

DATABASE = os.path.join(os.path.dirname(__file__), 'rosterraise.db')

# ─── Helper ────────────────────────────────────────────────────────────────────

def require_json(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        return f(*args, **kwargs)
    return wrapper

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/api/leaderboard/<team_name>', methods=['GET'])
def leaderboard(team_name):
    """
    Return top players by total sales for a given team.
    Players are ranked by sum of order prices.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT p.id, p.name, p.email, p.unique_slug,
               COALESCE(SUM(o.price * o.quantity), 0) AS total_sales,
               COALESCE(SUM(o.commission_earned), 0) AS total_commission
        FROM players p
        LEFT JOIN orders o ON o.player_id = p.id AND o.commission_status = 'completed'
        JOIN teams t ON t.id = p.team_id
        WHERE t.subdomain = ? OR t.name = ?
        GROUP BY p.id
        ORDER BY total_sales DESC
        LIMIT 50
    ''', (team_name, team_name))
    rows = cur.fetchall()
    conn.close()

    leaderboard = []
    for rank, row in enumerate(rows, start=1):
        leaderboard.append({
            "rank": rank,
            "player_id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "unique_slug": row["unique_slug"],
            "total_sales": row["total_sales"],
            "total_commission": row["total_commission"],
        })
    return jsonify({"team": team_name, "leaderboard": leaderboard})


@app.route('/api/webhook/stripe', methods=['POST'])
def stripe_webhook():
    """
    Handle Stripe webhook events.
    Currently handles checkout.session.completed.
    """
    payload = request.get_data(as_text=True)
    sig = request.headers.get('Stripe-Signature', '')
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, app.config['STRIPE_WEBHOOK_SECRET']
        )
    except Exception as e:
        return jsonify({"error": f"Webhook verification failed: {e}"}), 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        player_id = session.get('metadata', {}).get('player_id')
        team_id = session.get('metadata', {}).get('team_id')
        amount_total = session.get('amount_total', 0) / 100  # cents → dollars

        if player_id and amount_total > 0:
            conn = get_db()
            cur = conn.cursor()

            # Create order record
            cur.execute('''
                INSERT INTO orders (player_id, product_name, quantity, price,
                                    commission_earned, commission_status, stripe_session_id)
                VALUES (?, ?, 1, ?, ?, 'pending', ?)
            ''', (
                player_id,
                session.get('metadata', {}).get('product_name', 'Unknown'),
                amount_total,
                calculate_team_commission(amount_total),
                session.get('id'),
            ))
            order_id = cur.lastrowid

            # Mark commission as completed
            cur.execute('''
                UPDATE orders SET commission_status = 'completed'
                WHERE id = ?
            ''', (order_id,))

            # Credit the player
            credit_player(int(player_id), order_id)

            # Schedule payout for team
            commission = calculate_team_commission(amount_total)
            schedule_payout("team", int(team_id), commission)

            conn.commit()
            conn.close()
            print(f"[webhook] Order {order_id} completed for player {player_id}")

    return jsonify({"received": True})


@app.route('/api/payouts/trigger', methods=['POST'])
def trigger_payouts():
    """
    Manually trigger biweekly payout run.
    Processes all pending payouts and marks them as processing.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT id, entity_type, entity_id, amount, status
        FROM payouts
        WHERE status = 'scheduled'
    ''')
    pending = cur.fetchall()
    processed = []
    for row in pending:
        payout_id = row['id']
        cur.execute('UPDATE payouts SET status = ? WHERE id = ?', ('processing', payout_id))
        # In production: initiate Stripe transfer here
        processed.append({
            "payout_id": payout_id,
            "entity_type": row['entity_type'],
            "entity_id": row['entity_id'],
            "amount": row['amount'],
            "status": "processing"
        })
    cur.execute('UPDATE payouts SET status = ? WHERE status = ?', ('paid', 'processing'))
    conn.commit()
    conn.close()
    return jsonify({"triggered": len(pending), "payouts": processed})


@app.route('/api/payouts/<int:team_id>', methods=['GET'])
def get_payouts(team_id):
    """
    Return payout history for a team and next scheduled payout date.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT id, entity_type, entity_id, amount, status, created_at
        FROM payouts
        WHERE entity_type = 'team' AND entity_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    ''', (team_id,))
    rows = cur.fetchall()
    conn.close()

    payouts = [dict(row) for row in rows]
    # Next biweekly payout is 14 days from last paid payout or now
    next_date = (datetime.utcnow() + timedelta(days=14)).isoformat() + "Z"

    return jsonify({
        "team_id": team_id,
        "payouts": payouts,
        "next_payout_date": next_date,
        "count": len(payouts)
    })


@app.route('/api/partner/payout', methods=['POST'])
@require_json
def partner_payout():
    """
    Calculate and schedule partner commission based on number of teams.
    Body: {"partner_id": int, "num_teams": int, "total_amount": float}
    """
    data = request.json
    partner_id = data.get('partner_id')
    num_teams = data.get('num_teams', 0)
    total_amount = data.get('total_amount', 0.0)

    if not partner_id:
        return jsonify({"error": "partner_id is required"}), 400

    partner_rate, platform_rate = calculate_partner_commission(partner_id, num_teams)
    partner_amount = round(total_amount * partner_rate, 2)
    platform_amount = round(total_amount * platform_rate, 2)

    payout = schedule_payout("partner", partner_id, partner_amount)

    return jsonify({
        "partner_id": partner_id,
        "num_teams": num_teams,
        "partner_rate": f"{partner_rate*100:.0f}%",
        "partner_amount": partner_amount,
        "platform_amount": platform_amount,
        "payout": payout
    })


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "rosterraise-backend"})


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)