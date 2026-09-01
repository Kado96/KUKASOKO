"""add_subscriptions_payments_notifications

Revision ID: b4e062332144
Revises: 814e988f7d1e
Create Date: 2026-08-14 16:14:03.272826

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b4e062332144'
down_revision: Union[str, None] = '814e988f7d1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Table: ai_reports
    op.create_table('ai_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_type', sa.String(), nullable=False),
        sa.Column('content_json', sa.Text(), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('sent_to_count', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_reports_id'), 'ai_reports', ['id'], unique=False)

    # 2. Table: subscription_plans
    op.create_table('subscription_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(), nullable=False),
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('max_listings', sa.Integer(), nullable=False),
        sa.Column('featured_listings', sa.Boolean(), nullable=False),
        sa.Column('advanced_analytics', sa.Boolean(), nullable=False),
        sa.Column('marketing_tools', sa.Boolean(), nullable=False),
        sa.Column('notif_message_contact', sa.Boolean(), nullable=False),
        sa.Column('notif_weekly_report', sa.Boolean(), nullable=False),
        sa.Column('notif_listing_views', sa.Boolean(), nullable=False),
        sa.Column('notif_new_review', sa.Boolean(), nullable=False),
        sa.Column('notif_daily_ai_report', sa.Boolean(), nullable=False),
        sa.Column('notif_anomaly_alert', sa.Boolean(), nullable=False),
        sa.Column('notif_ai_recommendations', sa.Boolean(), nullable=False),
        sa.Column('email_notifications', sa.Boolean(), nullable=False),
        sa.Column('whatsapp_notifications', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscription_plans_code'), 'subscription_plans', ['code'], unique=True)
    op.create_index(op.f('ix_subscription_plans_id'), 'subscription_plans', ['id'], unique=False)

    # 3. Table: notifications
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)

    # 4. Table: subscriptions
    op.create_table('subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('ends_at', sa.DateTime(), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=False),
        sa.Column('whatsapp_number', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['subscription_plans.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscriptions_id'), 'subscriptions', ['id'], unique=False)
    op.create_index(op.f('ix_subscriptions_user_id'), 'subscriptions', ['user_id'], unique=False)

    # 5. Table: payments
    op.create_table('payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('transaction_id', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_index(op.f('ix_payments_transaction_id'), 'payments', ['transaction_id'], unique=True)
    op.create_index(op.f('ix_payments_user_id'), 'payments', ['user_id'], unique=False)

    # 6. Index manquants
    op.create_index(op.f('ix_listings_guest_token'), 'listings', ['guest_token'], unique=False)

    # 7. Seed initial pour les 3 plans d'abonnements
    op.execute(
        "INSERT INTO subscription_plans ("
        "code, name, description, price, currency, duration_days, "
        "max_listings, featured_listings, advanced_analytics, marketing_tools, "
        "notif_message_contact, notif_weekly_report, notif_listing_views, notif_new_review, "
        "notif_daily_ai_report, notif_anomaly_alert, notif_ai_recommendations, "
        "email_notifications, whatsapp_notifications, is_active"
        ") VALUES ("
        "'FREE', 'Free', 'Forfait de base pour dÃ©buter', 0.00, 'BIF', 30, "
        "5, false, false, false, "
        "true, false, false, false, false, false, false, "
        "false, false, true"
        ")"
    )

    op.execute(
        "INSERT INTO subscription_plans ("
        "code, name, description, price, currency, duration_days, "
        "max_listings, featured_listings, advanced_analytics, marketing_tools, "
        "notif_message_contact, notif_weekly_report, notif_listing_views, notif_new_review, "
        "notif_daily_ai_report, notif_anomaly_alert, notif_ai_recommendations, "
        "email_notifications, whatsapp_notifications, is_active"
        ") VALUES ("
        "'PRO', 'Pro', 'Pour les vendeurs professionnels', 10000.00, 'BIF', 30, "
        "50, true, true, true, "
        "true, true, true, true, false, false, false, "
        "true, true, true"
        ")"
    )

    op.execute(
        "INSERT INTO subscription_plans ("
        "code, name, description, price, currency, duration_days, "
        "max_listings, featured_listings, advanced_analytics, marketing_tools, "
        "notif_message_contact, notif_weekly_report, notif_listing_views, notif_new_review, "
        "notif_daily_ai_report, notif_anomaly_alert, notif_ai_recommendations, "
        "email_notifications, whatsapp_notifications, is_active"
        ") VALUES ("
        "'BUSINESS', 'Business', 'Solution sur mesure pour entreprises', 0.00, 'BIF', 30, "
        "500, true, true, true, "
        "true, true, true, true, true, true, true, "
        "true, true, true"
        ")"
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_listings_guest_token'), table_name='listings')
    op.drop_index(op.f('ix_payments_user_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_transaction_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_id'), table_name='payments')
    op.drop_table('payments')
    op.drop_index(op.f('ix_subscriptions_user_id'), table_name='subscriptions')
    op.drop_index(op.f('ix_subscriptions_id'), table_name='subscriptions')
    op.drop_table('subscriptions')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_subscription_plans_id'), table_name='subscription_plans')
    op.drop_index(op.f('ix_subscription_plans_code'), table_name='subscription_plans')
    op.drop_table('subscription_plans')
    op.drop_index(op.f('ix_ai_reports_id'), table_name='ai_reports')
    op.drop_table('ai_reports')
