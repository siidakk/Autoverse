@echo off
rem Starts everything AutoVerse needs, each in its own window.
rem Double click this file, wait for the browser to open, and that is it.

title AutoVerse launcher
cd /d "%~dp0"

echo.
echo   AUTOVERSE
echo   ---------
echo.

rem ---- dependencies, installed only if they are missing ----

if not exist "backend\node_modules" (
  echo   Installing backend packages, this happens once...
  pushd backend && call npm install --silent && popd
)

if not exist "frontend\node_modules" (
  echo   Installing frontend packages, this happens once...
  pushd frontend && call npm install --silent && popd
)

python -c "import flask, sklearn, pandas, joblib" >nul 2>&1
if errorlevel 1 (
  echo   Installing Python packages, this happens once...
  python -m pip install -r ml\requirements.txt --quiet
)

rem The recommender needs its trained files; build them if they are not there.
if not exist "ml\recommender.pkl" (
  echo   Training the recommendation model, this happens once...
  pushd ml && python train_model.py && popd
)

rem ---- the three services ----

echo   Starting the database on port 27019...
start "AutoVerse - Database" cmd /k "cd /d %~dp0backend && node tools/localMongo.mjs"

echo   Starting the recommendation service on port 8000...
start "AutoVerse - ML" cmd /k "cd /d %~dp0ml && python app.py"

echo   Starting the API on port 5000...
start "AutoVerse - API" cmd /k "cd /d %~dp0backend && npm start"

echo   Starting the site on port 5173...
start "AutoVerse - Web" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo   Waiting for everything to come up...
timeout /t 12 /nobreak >nul

start "" http://localhost:5173

echo.
echo   Open at http://localhost:5173
echo.
echo   Four windows have opened, one per service. Closing any of them stops
echo   that part of the site. Close them all to shut everything down.
echo.
echo   Accounts and saved builds go into backend\.data, so they survive a
echo   restart. Nothing leaves this machine.
echo.
pause
