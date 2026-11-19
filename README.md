# Smart Campus Complaint Management System

Web Engineering CCP. This milestone builds registration, sign-in, sign-out and role-based dashboard access with React, Vite, Express and MongoDB.

## Run locally on Windows

Install Node.js 22.12 or newer and start a local MongoDB server, or use a MongoDB Atlas connection string. Open this folder in VS Code and use PowerShell.

```powershell
npm ci
Copy-Item server/.env.example server/.env
```

The example connects to MongoDB on localhost. For Atlas, replace `MONGODB_URI` in `server/.env` with your connection string and set the target database to `campus_complaints`. Keep this file private. If you change the API port, update the proxy target in `client/vite.config.js`.

Run the API and frontend in separate terminals from the project root.

```powershell
npm run server
```

```powershell
npm run dev
```

Open the local URL printed by Vite. Register a test student with any valid email address and a password of at least 12 characters. Confirm the student appears in the `campus_complaints.users` collection and a second registration with the same email shows a duplicate-account error.

## How it works

The form posts to `POST /api/auth/register` through Vite's API proxy. Express validates and normalizes the input. Node's scrypt derives a salted password hash, and Mongoose stores the student record in MongoDB under a unique email index. The server sets the student role and returns only public account fields.

## Test sign-in and admin access

Sign in with the student you created previously using the same MongoDB URI. Refresh to verify your session persists, then sign out.

To create a separate admin account, add these lines to your existing `server/.env` and choose your own password of at least 12 characters.

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD="replace-with-your-own-password"
```

Run `npm run seed:admin` once. You can remove the two admin variables from `server/.env` after the account is created. Sign in through the same screen with the admin credentials and check that the Admin dashboard opens.

Login creates an eight-hour session in the MongoDB `sessions` collection. The browser receives an HTTP-only cookie, and MongoDB stores a hash of its token. The admin endpoint uses the account's role from MongoDB. These commands are for local development. A production run with `NODE_ENV=production` requires HTTPS for session cookies.

The dashboards use role-based access.

## Test complaint submission

Sign in as a student and submit a category, campus location and description. Confirm the complaint appears under **My complaints** with a unique ID and **Pending** status. Refresh the page to check persistence, then sign in with a second student account to check that its history is separate.

The API derives complaint ownership from the authenticated account and saves it with the complaint in MongoDB. Complaint categories are a fixed list shared by the form and API.

## Test complaint management

Sign in as an admin and open the complaint queue. Select a campus team and change a complaint to In Progress. Save, then mark it Resolved and enter a note describing the fix. Sign in again as the student who submitted the complaint. The team, updated status and note should appear under My complaints.

Assignments use campus teams such as IT Support and Facilities. Admin accounts manage the queue.

## Test feedback and dashboard counts

Resolve a complaint as an admin and check that the status counts update. As the student who reported it, open My complaints and submit a rating from 1 to 5 with an optional comment. Refresh and confirm that the saved feedback appears. Return to the admin queue to see the rating and comment.

Feedback is embedded in the complaint document. MongoDB saves it only if the signed-in student owns the complaint, its status is Resolved, and it has no saved feedback. Dashboard counts are calculated from the admin queue and update when a status is saved.
