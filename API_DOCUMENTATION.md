# 📚 API Documentation - GDGOC Study Jam Chatbot Backend

Selamat datang di dokumentasi API untuk project **Chatbot AI Multi-Persona** menggunakan Node.js, Express, Prisma ORM, PostgreSQL, dan Google Gemini 2.5 Flash API.

Base URL: `http://localhost:3000` (Sesuai `PORT` di file `.env` kamu)

---

## 🔐 1. Authentication & Users (`/users`)

Semua endpoint `/chatbot/*` memerlukan autentikasi login. Pastikan kamu melakukan Register dan Login terlebih dahulu sebelum mengetes endpoint chatbot di Postman.

### A. Register User Baru
* **Endpoint**: `POST /users/register`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "name": "Ronald Nur",
    "email": "ronald@gmail.com",
    "password": "password123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "User registered successfully",
    "data": {
      "id": "uuid-user-1234",
      "name": "Ronald Nur",
      "email": "ronald@gmail.com",
      "createdAt": "2026-07-04T12:00:00.000Z"
    }
  }
  ```

### B. Login User
* **Endpoint**: `POST /users/login`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "ronald@gmail.com",
    "password": "password123"
  }
  ```
* **Response (200 OK)**:
  *(Catatan: Endpoint ini otomatis menaruh cookie `token` di browser/Postman kamu)*
  ```json
  {
    "status": 200,
    "message": "Login Successfully",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn..."
    }
  }
  ```
> 💡 **Tips Postman**: Setelah hit endpoint `/users/login`, Postman secara otomatis menyimpan Cookie `token`. Jadi saat kamu memanggil endpoint `/chatbot/*`, cookie tersebut langsung terkirim otomatis!

---

## 🤖 2. Chatbot AI (`/chatbot`)

Aplikasi ini mendukung 2 mode persona (`promptType`):
1. **`"sosmed_mastermind"` (Default)**: Konsultan strategi sosial media umum dari file `system_prompt.md`.
2. **`"youtube_repurpose"`**: Pengubah transkrip video YouTube menjadi naskah TikTok viral berformat JSON murni dari file `prompt_youtube.md`.

### A. Kirim Pesan Baru (`send-message`)

#### 🟢 Contoh 1: Mode Konsultasi Sosmed (Default)
* **Endpoint**: `POST /chatbot/send-message`
* **Cookie**: `token=...`
* **Request Body**:
  ```json
  {
    "userInput": "Bagaimana cara membuat hook TikTok yang memikat retensi penonton di 3 detik pertama?"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "Chat processed successfully",
    "data": {
      "userId": "uuid-user-1234",
      "userInput": "Bagaimana cara membuat hook TikTok...",
      "promptType": "sosmed_mastermind",
      "botReply": "Untuk membuat hook yang memikat di 3 detik pertama, gunakan pola Curiosity Gap..."
    }
  }
  ```

#### 🟢 Contoh 2: Mode YouTube to TikTok Generator (Manual Transkrip)
* **Endpoint**: `POST /chatbot/send-message`
* **Cookie**: `token=...`
* **Request Body**:
  ```json
  {
    "promptType": "youtube_repurpose",
    "tone": "Lucu, gaul, dan penuh semangat",
    "userInput": "Halo semuanya selamat datang kembali di channel GDGOC Study Jam! Hari ini kita akan belajar tentang bagaimana Google Gemini AI bisa membantu developer memodifikasi kode dengan cepat tanpa harus menghafal banyak sintaks rumit..."
  }
  ```
* **Response (200 OK)**:
  *(Perhatikan bahwa `botReply` otomatis berupa Object JSON murni, bukan teks biasa!)*
  ```json
  {
    "status": 200,
    "message": "Chat processed successfully",
    "data": {
      "userId": "uuid-user-1234",
      "userInput": "Halo semuanya selamat datang kembali...",
      "promptType": "youtube_repurpose",
      "botReply": {
        "results": [
          {
            "part": 1,
            "topic_summary": "Belajar Coding AI Tanpa Hafal Sintaks",
            "visual_cues": "[Tampilkan layar laptop dengan terminal AI yang sedang mengetik otomatis]",
            "hook_script": "Capek ngoding error terus? Gini caranya biar AI yang nulis kodenya buat lu dalam 3 detik!",
            "body_script": "Fitur baru Gemini AI bikin kita gak perlu lagi hafalin sintaks ribet. Tinggal ketik mau bikin fitur apa, langsung jadi rapi!",
            "caption": "Siapa nih yang masih sering typo pas ngoding? Tonton ini biar coding lu auto ngebut! 🔥",
            "hashtags": ["#fyp", "#coding", "#geminiAI", "#gdgoc"]
          }
        ]
      }
    }
  }
  ```

#### 🟢 Contoh 3: Mode YouTube Auto-Scrape Link (SUPER POWER! 🔥)
Kamu tidak perlu lagi repot copy-paste teks transkrip manual! Cukup taruh **Link YouTube** di field `userInput`, backend otomatis mendownload subtitle video tersebut dan mengubahnya jadi naskah TikTok berformat JSON!
* **Endpoint**: `POST /chatbot/send-message`
* **Cookie**: `token=...`
* **Request Body**:
  ```json
  {
    "promptType": "youtube_repurpose",
    "tone": "Dramatis, cepat, dan penasaran",
    "userInput": "Tolong buatin hook dan naskah tiktok dari video ini dong https://www.youtube.com/watch?v=jNQXAC9IVRw"
  }
  ```
* **Response (200 OK)**:
  *(Backend otomatis mengambil subtitle dari link YouTube tersebut, lalu menyuapinya ke Gemini!)*
  ```json
  {
    "status": 200,
    "message": "Chat processed successfully",
    "data": {
      "userId": "uuid-user-1234",
      "userInput": "Tolong buatin hook dan naskah tiktok dari video ini dong https://www.youtube.com/watch?v=jNQXAC9IVRw",
      "promptType": "youtube_repurpose",
      "botReply": {
        "results": [ ...naskah tiktok json dari video tersebut... ]
      }
    }
  }
  ```

---

### B. Ambil Semua Riwayat Chat User (`get-chats`)
* **Endpoint**: `GET /chatbot/get-chats`
* **Cookie**: `token=...`
* **Response (201 Created)**:
  ```json
  {
    "status": 201,
    "message": "Successfully Get All Chat",
    "data": [
      {
        "id": "uuid-chat-999",
        "userId": "uuid-user-1234",
        "userInput": "Halo semuanya...",
        "botReply": { "results": [ ... ] },
        "promptType": "youtube_repurpose",
        "createdAt": "2026-07-04T13:40:00.000Z",
        "updatedAt": "2026-07-04T13:40:00.000Z"
      },
      {
        "id": "uuid-chat-888",
        "userId": "uuid-user-1234",
        "userInput": "Bagaimana cara membuat hook TikTok...",
        "botReply": "Untuk membuat hook yang memikat...",
        "promptType": "sosmed_mastermind",
        "createdAt": "2026-07-04T13:30:00.000Z",
        "updatedAt": "2026-07-04T13:30:00.000Z"
      }
    ]
  }
  ```

---

### C. Ambil Detail Chat Berdasarkan ID (`get-chat/:id`)
* **Endpoint**: `GET /chatbot/get-chat/uuid-chat-999`
* **Cookie**: `token=...`
* **Response (201 Created)**:
  ```json
  {
    "status": 201,
    "message": "Successfully Chat By Id",
    "data": {
      "id": "uuid-chat-999",
      "userId": "uuid-user-1234",
      "userInput": "Halo semuanya...",
      "botReply": { "results": [ ... ] },
      "promptType": "youtube_repurpose",
      "createdAt": "2026-07-04T13:40:00.000Z",
      "updatedAt": "2026-07-04T13:40:00.000Z"
    }
  }
  ```

---

### D. Update Chat & Generate Ulang Respons (`update-chat/:id`)
Berguna jika user ingin merevisi prompt lama, sistem akan otomatis mengenali apakah chat tersebut menggunakan mode `sosmed_mastermind` atau `youtube_repurpose`.
* **Endpoint**: `PUT /chatbot/update-chat/uuid-chat-999`
* **Cookie**: `token=...`
* **Request Body**:
  ```json
  {
    "newPrompt": "Revisi transkrip: Hari ini kita bahas 5 trik rahasia Gemini AI di tahun 2026...",
    "tone": "Super dramatis dan penasaran"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "Successfully updated chat",
    "data": {
      "userInput": "Revisi transkrip: Hari ini kita bahas...",
      "botReply": {
        "results": [ ...naskah tiktok baru... ]
      }
    }
  }
  ```

---

### E. Hapus Chat (`delete/:id`)
* **Endpoint**: `DELETE /chatbot/delete/uuid-chat-999`
* **Cookie**: `token=...`
* **Response (201 Created)**:
  ```json
  {
    "status": 201,
    "message": "Successfully Delete Chat",
    "data": {
      "deleteChat": {
        "id": "uuid-chat-999",
        "userInput": "..."
      }
    }
  }
  ```
