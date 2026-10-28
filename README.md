# Code Guru (Android)

Offline AI/ML tutor that teaches like a game: 14 stages from zero to job-ready
(learn → teacher class with drawn sketches and voice → practice with real Python → games → test → IQ questions),
score 80% to unlock the next stage, earn XP, streaks and badges. Notes, stage download / PDF, Ask the Guru (offline
search), Code Playground (numpy, pandas, scikit-learn, matplotlib). Includes the AI/ML + Python Master Book (59 stages) and 9 Cheat Books (Python, SQL, Git, Docker,
AI & LLM, FastAPI, Node & Express, JavaScript, React) as game-style courses. Every stage has a Summary tab
(summary, main point of each lesson, glossary). Revision with spaced-repetition flashcards, a timed Mock IQ exam
(MCQ or spoken IQ round) with a weak-topic report, and a Progress dashboard (daily XP goal, 7-day chart, weak stages). Any book or notes file can be turned
into a course inside the app, offline: PDF, Word, PowerPoint, EPUB, Jupyter notebook, Markdown, HTML, TXT, ODT and code
files; a pack made by Claude (.json) can also be imported.

Made by Aakash Sharma · cse211901204@gmail.com

## What is inside
- `app/src/main/assets/www/` — the whole tutor (HTML/JS). `packs/` holds the course content
  (AI/ML Engineer: 14 stages in Hinglish, Hindi and English; roadmaps for 15 roles).
- `app/src/main/assets/www/vendor/pyodide/` — offline Python 3.14 (Pyodide 314.0.7, MPL-2.0 licence).
  numpy, pandas, scikit-learn, matplotlib and their dependencies are downloaded from the official Pyodide CDN
  during the GitHub Actions build (`tools/fetch_pyodide_packages.py`, sha256-checked) and packed into the APK.
- `app/src/main/assets/www/vendor/pdfjs/` — pdf.js 5.7.284 (Apache-2.0) to read PDFs offline.
- `app/src/main/java/.../MainActivity.java` — WebView shell: serves the assets offline, file picker for
  PDFs/packs/backups, phone text-to-speech for the teacher voice, save files, print / Save as PDF, back button.
- `source/` — content source files (one JSON per stage) and tools:
  `python3 source/tools/validate.py <files>` checks a stage (runs every code example),
  `python3 source/tools/build_packs.py` rebuilds the packs (run from a folder laid out like `source/`).

All progress is stored only on the phone (WebView storage). Settings → Backup creates a backup file.

## Build the APK with GitHub Actions
1. Push this folder to a GitHub repository.
2. Add 4 repository secrets (Settings → Secrets and variables → Actions):
   `KEY_ALIAS`, `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEYSTORE_BASE64` (same values as your keystore-secrets.txt).
3. Actions → "Build Android APK" runs on every push; download the `CodeGuru-APK` artifact.
4. Push a tag like `v1.0` to publish a GitHub Release with the APK.

## Tech
Android Gradle Plugin 8.7.3, Gradle 8.9, JDK 17, minSdk 24 (Android 7.0), targetSdk 35. No third-party Android libraries.
