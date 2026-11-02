# Student Management System

A beginner-friendly full-stack school management project. The backend is Django REST Framework with SQLite; the frontend is HTML, CSS and JavaScript served by Django. No Node.js installation is required.

## Features
- Student, classroom and academic-result CRUD APIs
- Search students by name, email or admission number
- Filter students by classroom and gender; paginated lists
- Filter results by student/class/subject/term/session
- Server-calculated total scores and grades
- Duplicate result prevention and score validation
- Dashboard statistics calculated from SQLite
- Public read access; authenticated Django staff accounts can create, update and delete
- Responsive browser dashboard with staff sign-in shown first
- Inline student, class and result forms (no modal pop-ups)
- CSRF-protected write requests; staff accounts are created using Django management commands
- Django Admin remains available by direct URL for authorised administrators, but is not linked from the user interface
- Basic automated tests

## Run on Windows
1. Install Python from python.org if Python is not already installed.
2. Extract this folder and open the `mangement 1` folder in VS Code.
3. Open Terminal in VS Code.
4. Create and activate a virtual environment:

   ```powershell
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

   If PowerShell blocks activation, use Command Prompt and run `venv\Scripts\activate.bat`.

5. Install the packages:

   ```powershell
   python -m pip install -r requirements.txt
   ```

6. Create the database tables:

   ```powershell
   python manage.py makemigrations students
   python manage.py migrate
   ```

7. Create a staff login:

   ```powershell
   python manage.py createsuperuser
   ```

   Enter a username, email if requested, and password.

8. Start the website:

   ```powershell
   python manage.py runserver
   ```

9. Open `http://127.0.0.1:8000/` for the frontend and sign in with the staff account created above. The API remains under `http://127.0.0.1:8000/api/`. The Django Admin is still available to authorised administrators at `/admin/`, but the frontend does not display a link to it.

## API endpoints
- `GET/POST /api/students/`
- `GET/PUT/PATCH/DELETE /api/students/<id>/`
- `GET/POST /api/classes/`
- `GET/PATCH/DELETE /api/classes/<id>/`
- `GET /api/classes/<id>/students/`
- `GET/POST /api/results/`
- `GET/PATCH/DELETE /api/results/<id>/`
- `GET /api/students/<id>/results/`
- `GET /api/dashboard/`
- `GET /api/auth-check/` (staff credential check for the frontend)

Student search examples:
- `/api/students/?search=Ada`
- `/api/students/?classroom=1`
- `/api/students/?gender=F`
- `/api/results/?term=First&session=2026%2F2027`
- `/api/results/?student__classroom=1`

## Postman
Use `http://127.0.0.1:8000` as the base URL. For read requests, select GET. To create records, choose POST, select Body → raw → JSON, and paste a sample request from `postman_collection.json`. For protected write requests, open the Authorization tab, select Basic Auth, and enter your Django staff username and password.

## Run tests
```powershell
python manage.py test
```

## Important notes
- Gender values for the API are `M`, `F`, or `P`.
- Result totals and grades are read-only; the server calculates them.
- CA score must be 0–40 and exam score 0–60.
- Only Django staff users can write to API records.
- This setup is for learning and local development. Before deploying publicly, set `DEBUG = False`, use a secure secret key, configure `ALLOWED_HOSTS`, HTTPS and production static files.
