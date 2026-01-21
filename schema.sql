CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR UNIQUE,
    password_hash VARCHAR
);

CREATE TABLE work_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    login_time DATETIME,
    logout_time DATETIME,
    duration_minutes INTEGER,
    pop_description VARCHAR,
    push_command VARCHAR,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
