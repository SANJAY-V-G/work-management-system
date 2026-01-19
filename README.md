
# Work Hours Tracking System

## Prerequisites

- Python 3.9+
- Node.js & npm

## Backend Setup (FastAPI)

1. Navigate to the backend folder:
   ```sh
   cd backend
   ```

2. Create a virtual environment:
   ```sh
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```

4. Run the server:
   ```sh
   uvicorn main:app --reload
   ```
   The backend will run at `http://localhost:8000`.

## Frontend Setup (React + Vite)

1. Navigate to the frontend folder:
   ```sh
   cd frontend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```
   *Note: If you run into issues, delete node_modules and package-lock.json and try again.*

3. Run the development server:
   ```sh
   npm run dev
   ```
   The frontend will run at `http://localhost:5173` (typically).

## Usage Guide

1. **Register**: Open the app, toggle to "Register", and create a new account.
2. **Login**: Use your credentials to log in.
3. **Start Work**: Click the big "Login (Start Work)" button to begin tracking time.
4. **End Work**: Click the "Logout (End Work)" button to stop tracking time.
5. **View Logs**: See your history in the table below.
6. **Download CSV**: Click "Download CSV" to get a report.
7. **Logout**: Click the "Logout" button in the top right to exit the application.
