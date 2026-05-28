"""
Stripe integration for RosterRaise.
Handles checkout sessions, commission calculations, and payout scheduling.
"""
import stripe
import os
from datetime import datetime, timedelta

# Placeholder key — replace with real key in production
stripe.api_key = os.environ.get("STRIPE_KEY_HERE", "sk_test_placeholder")

TEAM_COMMISSION_RATE = 0.30  # 30% of session total

def create_checkout_session(team_id, player_id, product_name, unit_price_cents, success_url=None, cancel_url=None):
    """
    Create a Stripe Checkout Session for a product.
    player_id is stored in metadata for webhook correlation.
    """
    success_url = success_url or "https://rosterraise.com/success"
    cancel_url = cancel_url or "https://rosterraise.com/cancel"

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": product_name},
                "unit_amount": unit_price_cents,
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "team_id": str(team_id),
            "player_id": str(player_id),
            "product_name": product_name,
        }
    )
    return session

def calculate_team_commission(session_total):
    """
    Calculate team commission (30% of session total).
    """
    return round(session_total * TEAM_COMMISSION_RATE, 2)

def calculate_partner_commission(partner_id, num_teams):
    """
    Calculate partner commission based on number of teams referred.
    Tiers:
      0-2 teams  -> 20% partner / 10% platform
      3-5 teams  -> 25% partner / 12% platform
      6+ teams   -> 30% partner / 15% platform
    Returns: (partner_rate, platform_rate)
    """
    if num_teams <= 2:
        return 0.20, 0.10
    elif num_teams <= 5:
        return 0.25, 0.12
    else:
        return 0.30, 0.15

def schedule_payout(entity_type, entity_id, amount):
    """
    Schedule a payout for a team or partner.
    In production this would write to a payouts table or call Stripe Transfers.
    Returns a payout record dict.
    """
    payout = {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "amount": amount,
        "status": "scheduled",
        "scheduled_at": (datetime.utcnow() + timedelta(days=14)).isoformat(),
    }
    return payout