# 🚀 Safarnama Developer Setup Guide

Welcome to the **Safarnama** project! This guide helps you set up the full-stack application (Frontend + Backend) with local development and cloud deployment instructions.
---

## 📦 Prerequisites

Before starting, make sure you have these installed:

- **Node.js** (>= 16.0.0) ➡️ [Download](https://nodejs.org/)
- **MongoDB Atlas Account** ➡️ [Create Free Cluster](https://www.mongodb.com/cloud/atlas)
- **Visual Studio Code** (recommended) ➡️ [Download](https://code.visualstudio.com/)
- **Android Studio** (for Emulator & debugging)
- **Expo Go App** (on your Android device)
- **Expo CLI & EAS CLI** ➡️ Installed via `npm i -g expo-cli eas-cli`
- **Expo Account** ➡️ [Sign Up](https://expo.dev)

---

## 🛠 Backend Setup (Node.js + Express + MongoDB)

### 1. **Clone the Backend Repository**

```bash
git clone https://github.com/Divyanshverma1000/safarnama-backend.git
cd safarnama-backend
```

### 2. **Environment Configuration**

Create a `.env` file in the root directory and fill it like this:

```env
MONGO_URI="your-mongodb-connection-string"
JWT_SECRET="your-secret-key"
PORT="8080"

EMAIL_USER="safarnama.team@gmail.com" # your new email
EMAIL_PASS="your-google-app-password"

CLIENT_URL="https://your-backend-production-url"
```

✅ **Notes**:
- Use [MongoDB Atlas](https://cloud.mongodb.com/) for your database.
- Generate a Google **App Password** to allow the backend to send emails (used for password reset and OTP).
- `CLIENT_URL` should point to your deployed backend (e.g., Railway or Render/ We used Railway in early devlopment but shifted to GCE-VM and GCE-VM is recommended as well).

### 3. **Install Backend Dependencies**

```bash
npm install
```

### 4. **Run the Backend Server**

```bash
npm start
```

Your backend will now be live at: `http://localhost:8080`
> ⚠️ Note: A **locally running backend** is not reachable from your real Android device using the Dev APK.
> To test API calls from the app, you must **deploy the backend** to a public URL and use that in `API_BASE_URL`.

## ☁️ Deploying Backend on Google Cloud VM
### Step-by-step GCE VM Setup with Commands

#### 1. SSH into Your GCE VM
- Go to **Google Cloud Console → Compute Engine → VM Instances**
- Click **SSH** next to your instance to open terminal.

#### 2. Update System & Install Tools
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git
```

#### 3. Install Node.js (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

#### 4. Install pm2 for Process Management
```bash
sudo npm install -g pm2
pm2 -v
```

#### 5. Clone Your Repo & Install
```bash
git clone https://github.com/Divyanshverma1000/safarnama-backend.git
cd safarnama-backend
npm install
```

#### 6. Run Backend with pm2
```bash
pm2 start server.js --name safarnama-backend
pm2 startup
# Follow instructions and run the printed command
pm2 save
```

#### 7. Open Port 8000
Go to **VPC Network → Firewall → Create Rule**:
- Allow **TCP:8000** from **0.0.0.0/0**
- Tag the VM as `backend`

Or via CLI:
```bash
gcloud compute firewall-rules create allow-backend-8000 \
--allow tcp:8000 --sourceranges 0.0.0.0/0 --target-tags backend
```

#### 8. Test
Open:  
```
http://<VM_EXTERNAL_IP>:8000
```

---
### 6. **Connect Frontend to Backend**

In the frontend project (`src/lib/axios.ts`), replace this line with your backend URL:

```ts
export const API_BASE_URL = "https://your-backend-production-url";
```

---

## 🌐 Frontend Setup (React Native Expo App)

### 1. **Clone the Frontend Repository**

```bash
git clone https://github.com/Divyanshverma1000/DEP25-G18-Safarnama.git
cd DEP25-G18-Safarnama
```

### 2. **Login to EAS (Expo Application Services)**

```bash
eas login
```

Create a project on [expo.dev](https://expo.dev), and copy the `projectId`.  
Then, add it in `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "your-project-id"
  }
}
```

### 3. **Install Frontend Dependencies**

```bash
npm install
```

### 4. **Build a Development APK**

```bash
eas build --profile development --platform android
```

Once built, install the APK on your real device.

### 5. **Start Expo Server with Live Tunnel**

```bash
npx expo start --tunnel
```

Now scan the QR code from the terminal using **Expo Go** app, and it will launch your pre-installed Dev Build APK.

✅ This enables **live updates** and **hot reloading** on a real device using your local server — without rebuilding every time!

---

## ✅ Development Workflow Summary

1. **Deploy backend**  preferably GCE-VM free for 3 months can switch email if needed (U can also use Railway / Render / Hostinger as well) — local backend won't work with the Dev APK.
2. **Update frontend** `API_BASE_URL` in `src/lib/axios.ts` to point to the live backend URL.
3. **Build the Dev APK** once using EAS: `eas build --profile development --platform android`.
4. Start the frontend with: `npx expo start --tunnel`.
5. Scan the QR with Expo Go to trigger the Dev APK — it will now fetch data from the **live backend**.
6. You're now all set to develop with hot reloading and a working backend connection!


---

## 🧠 Pro Tips

- Use `expo doctor` to detect and fix issues in your environment.
- For faster testing, use Android Emulator via Android Studio if you don't have a physical device.
- Restart `npx expo start --tunnel` if the QR code stops responding or tunnel breaks.
- U can try for clearing the cache for the build as sometimes it troubles  , use this command `npx expo start -c --tunnel`
---




Let’s keep the code clean, the logs meaningful, and the travel adventurous! ✨

---
