# inDrive Clone — Full Stack (Local, No Hosting Required)

A ride-hailing app clone with **fare bidding/negotiation** (like inDrive's core feature),
built with:
- **Backend:** Node.js + Express + MongoDB + Socket.io (real-time offers & tracking)
- **Mobile app:** React Native (Expo) — rider flow + driver flow
- **Admin panel:** plain HTML/JS, served directly by the backend at `/admin`

Everything runs on your machine only. Nothing needs to be deployed to the internet.

---

## 1. Prerequisites

- Node.js 18+ installed
- MongoDB running locally ([install guide](https://www.mongodb.com/docs/manual/installation/)) — or use a free MongoDB Atlas connection string, still no "hosting" of your own code needed
- Expo Go app on your phone (App Store / Play Store) **or** an Android/iOS emulator
- Your computer and phone on the **same Wi-Fi network** (so the phone can reach your backend)

---

## 2. Run the backend

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env` if needed (default assumes MongoDB running on `localhost:27017`).

Start MongoDB (if not already running):
```bash
mongod
```

Create an admin account so you can log into the admin panel:
```bash
node seedAdmin.js
```
This prints an email/password — use it to log in.

Start the backend:
```bash
npm run dev
```
You should see `Server running on http://localhost:5000`.

Test it: open `http://localhost:5000/api/health` in a browser — you should see `{ "ok": true }`.

---

## 3. Use the Admin Panel

Open `http://localhost:5000/admin` in your browser, log in with the admin credentials
from step 2. From here you can:
- Approve/reject driver document verifications
- View/suspend users
- View all rides
- See live stats (total rides, revenue, pending drivers, etc.)

---

## 4. Run the mobile app

First, find your computer's local IP address (not `localhost`):
- Mac/Linux: `ifconfig | grep "inet "`
- Windows: `ipconfig`

It'll look like `192.168.x.x`. Put it in:
```
mobile/src/api/client.js  →  export const BASE_URL = 'http://192.168.x.x:5000';
```

Then:
```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your phone (same Wi-Fi network as your computer).

> **Maps note:** iOS uses Apple Maps automatically — no key needed. Android's map tiles
> need a Google Maps API key — add yours in `mobile/app.json` under
> `expo.android.config.googleMaps.apiKey`, or the map will render blank on Android
> (everything else in the app still works).

---

## 5. Try the full flow

1. Register two accounts in the app: one as **Rider**, one as **Driver**.
2. As the driver, go to "Upload / Update Documents" and submit sample photos.
3. In the admin panel, approve that driver's documents.
4. As the driver, toggle **Online**.
5. As the rider, tap the map to set pickup/drop-off, suggest a fare, and request a ride.
6. As the driver, you'll see the request appear — send a counter-offer.
7. As the rider, accept the offer in the Bidding screen.
8. As the driver, advance the ride: arriving → in progress → completed.
9. As the rider, you'll be prompted to rate the ride.

---

## Project structure

```
indrive-clone/
├── backend/          Node.js + Express + MongoDB + Socket.io API
├── mobile/            React Native (Expo) app — rider & driver
└── admin-panel/       Static HTML/JS dashboard (served by backend at /admin)
```

## Core features implemented

- JWT auth (rider / driver / admin roles)
- Rider posts a ride with a suggested fare (the "bid")
- Drivers see nearby requests and send counter-offers in real time (Socket.io)
- Rider accepts an offer → ride locked in, driver notified instantly
- Live driver location streaming during the ride
- Ride status lifecycle: requested → negotiating → accepted → arriving → in_progress → completed
- Two-way ratings (rider ↔ driver) that update running averages
- Driver document upload (license, registration, insurance) + admin approval workflow
- Admin dashboard: stats, driver verification, user management, ride history

## Not included (intentionally, for a local dev clone)

- Real payment processing (payment method is recorded, but no live card charge)
- Push notifications (would need a hosted push service)
- Route/turn-by-turn navigation (only pickup/drop-off pins + live driver marker)
- Production security hardening (rate limiting, refresh tokens, etc.) — fine for local dev, **add before any real deployment**
