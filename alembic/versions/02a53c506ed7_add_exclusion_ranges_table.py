"""Add exclusion_ranges table

Revision ID: 02a53c506ed7
Revises: c12345678901
Create Date: 2025-09-03 13:16:34.025067

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '02a53c506ed7'
down_revision: Union[str, None] = 'c12345678901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'exclusion_ranges',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('activity_id', sa.Integer(), sa.ForeignKey('activities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('start_time_seconds', sa.Integer(), nullable=False, comment='seconds from activity start'),
        sa.Column('end_time_seconds', sa.Integer(), nullable=False, comment='seconds from activity start'),
        sa.Column('reason', sa.String(100), nullable=True, comment='user-provided reason'),
        sa.Column('exclusion_type', sa.String(20), nullable=False, default='user_range', comment='user_range, auto_point, user_point (future)'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, default=sa.text('now()')),
        
        # Unique constraint to prevent duplicate ranges
        sa.UniqueConstraint('activity_id', 'start_time_seconds', 'end_time_seconds', 'exclusion_type', name='uq_exclusion_ranges_activity_time_type'),
        
        # Index for fast lookups
        sa.Index('ix_exclusion_ranges_activity_id', 'activity_id'),
        sa.Index('ix_exclusion_ranges_time', 'activity_id', 'start_time_seconds', 'end_time_seconds')
    )


def downgrade() -> None:
    op.drop_table('exclusion_ranges')