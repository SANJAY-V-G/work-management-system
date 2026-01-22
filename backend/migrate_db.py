from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        # Commit implicitly or explicitly depending on driver, but usually text execution needs commit for DDL in some engines
        # or we rely on autocommit isolation level. SQLAlchemy 2.0 changes this, but let's try standard execute.
        # For safety with most drivers, we use individual executions.
        
        try:
            conn.execute(text("ALTER TABLE work_logs ADD COLUMN pop_description VARCHAR"))
            conn.commit()
            print("Added pop_description column")
        except Exception as e:
            print(f"Column pop_description might already exist or error: {e}")
            conn.rollback()

        try:
            conn.execute(text("ALTER TABLE work_logs ADD COLUMN push_command VARCHAR"))
            conn.commit()
            print("Added push_command column")
        except Exception as e:
            print(f"Column push_command might already exist or error: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrate()
