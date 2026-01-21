import sqlite3

def migrate():
    conn = sqlite3.connect('work_tracking.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE work_logs ADD COLUMN pop_description VARCHAR")
        print("Added pop_description column")
    except sqlite3.OperationalError as e:
        print(f"Column pop_description might already exist: {e}")

    try:
        cursor.execute("ALTER TABLE work_logs ADD COLUMN push_command VARCHAR")
        print("Added push_command column")
    except sqlite3.OperationalError as e:
        print(f"Column push_command might already exist: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
