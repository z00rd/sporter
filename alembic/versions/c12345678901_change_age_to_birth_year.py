"""Change age to birth_year in users table

Revision ID: c12345678901
Revises: b25508eccc85
Create Date: 2025-09-02 19:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c12345678901'
down_revision: Union[str, None] = 'b25508eccc85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add birth_year column
    op.add_column('users', sa.Column('birth_year', sa.Integer(), nullable=True))
    
    # Migrate existing age data to birth_year (convert age to approximate birth year)
    # Assuming current year is 2025
    op.execute("UPDATE users SET birth_year = 2025 - age WHERE age IS NOT NULL")
    
    # Drop age column
    op.drop_column('users', 'age')


def downgrade() -> None:
    # Add age column back
    op.add_column('users', sa.Column('age', sa.Integer(), nullable=True))
    
    # Migrate birth_year back to age
    op.execute("UPDATE users SET age = 2025 - birth_year WHERE birth_year IS NOT NULL")
    
    # Drop birth_year column
    op.drop_column('users', 'birth_year')