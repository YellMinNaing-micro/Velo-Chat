# VeloChat - Real-Time Glassmorphic Messaging App

VeloChat is a premium, real-time messaging application built with a high-performance **ASP.NET Core 10 Web API** backend and a responsive **React (Vite) SPA** client. 

This repository is structured as a monorepo containing:
- **`VeloChat.WebAPI`**: The backend services, utilizing MSSQL for relational data/Identity, MongoDB for chat histories, and SignalR for real-time WebSockets.
- **`VeloChat.Client`**: The frontend React client styled with a premium light glassmorphic Slack/Telegram-inspired design system.

---

## Language / ဘာသာစကား
- [English Version (Default)](#english-documentation)
- [Burmese Version (မြန်မာဘာသာ)](#မြန်မာဘာသာ-မှတ်တမ်း)

---

## English Documentation

### Key Features
- **Secure Custom JWT Auth**: Handles registrations, logins, token refresh rotations, and token revocations (Access token expires in 15 mins, sliding-window Refresh token in 7 days).
- **Real-Time Websockets (SignalR)**: Real-time message broadcasting, typing indicators (`test_user is typing...`), and user presence (Active Now / Offline status).
- **Dual Database Strategy**:
  - **MSSQL**: Relational data, including users (ASP.NET Core Identity), friendship linkages (pending, accepted requests), and chat rooms.
  - **MongoDB**: High-speed schema-less storage for historical chat message documents.
- **Interactive OpenAPI Documentation (Scalar)**: Integrated .NET 10 OpenAPI with Scalar to provide a modern, interactive endpoint reference page.
- **Dynamic User Search**: Add friends by typing their `Username` or `Full Name`. The UI dynamically queries the database and shows inline badges based on relationship status (`Add`, `Pending`, or `Chat`).
- **Contrast & Legibility Fixes**: The sidebar active chat room text features high-contrast rendering for clear readability.

---

### Tech Stack
- **Backend**:
  - ASP.NET Core 10 (Web API)
  - Entity Framework Core 10 (SQL Server Provider)
  - MongoDB C# Driver
  - SignalR
  - Scalar API Reference (`Scalar.AspNetCore` + .NET 10 OpenApi)
- **Frontend**:
  - React 19 + Vite
  - Axios (with interceptors to auto-attach JWTs and auto-rotate expired tokens)
  - Lucide React (premium icons)

---

### System Requirements
- **.NET 10 SDK**
- **Node.js (v18 or higher)**
- **Microsoft SQL Server** (LocalDB or full instance running locally)
- **MongoDB** (running on `mongodb://localhost:27017`)

---

### Setup & Getting Started

#### 1. Backend Setup (`VeloChat.WebAPI`)
1. Open a terminal and navigate to the backend folder:
   ```powershell
   cd VeloChat.WebAPI
   ```
2. Verify connection strings in `appsettings.json`:
   - **SQL Server Connection**: `Server=localhost;Database=Velo_Chat;User Id=sa;Password=Password@123;TrustServerCertificate=True` (Update credentials if your local SQL Server instance is different).
   - **MongoDB Connection**: `mongodb://localhost:27017` with Database `VeloChat_Messages`.
3. Apply Entity Framework migrations to build tables in MSSQL:
   ```powershell
   dotnet ef database update
   ```
4. Start the Web API:
   ```powershell
   dotnet run
   ```
   The backend will start on `https://localhost:7010` (and `http://localhost:5010`).
5. Open `https://localhost:7010/scalar/v1` in your browser to view the interactive Scalar API documentation.

#### 2. Frontend Setup (`VeloChat.Client`)
1. Open a new terminal and navigate to the frontend client folder:
   ```powershell
   cd VeloChat.Client
   ```
2. Install npm dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## မြန်မာဘာသာ မှတ်တမ်း

VeloChat သည် စွမ်းဆောင်ရည်မြင့်မားသော **ASP.NET Core 10 Web API** နှင့် လှပသပ်ရပ်သော **React (Vite)** frontend ကို အသုံးပြု၍ ဖန်တီးထားသည့် real-time စကားပြော (messaging) စနစ်ဖြစ်ပါသည်။

ဤပရောဂျက်ကို အောက်ပါအတိုင်း ပိုင်းခြားတည်ဆောက်ထားပါသည် -
- **`VeloChat.WebAPI`**: Backend ဝန်ဆောင်မှုများဖြစ်ပြီး User Identity နှင့် Friendship မော်ဒယ်များအတွက် MSSQL ကို လည်းကောင်း၊ Chat messages စာတိုများ သိမ်းဆည်းရန် MongoDB ကို လည်းကောင်း၊ Real-time ဆက်သွယ်မှုများအတွက် SignalR WebSocket ကို လည်းကောင်း အသုံးပြုထားသည်။
- **`VeloChat.Client`**: Slack/Telegram ကဲ့သို့ သပ်ရပ်ပြီး လင်းလက်သော Light Glassmorphism ဒီဇိုင်းဖြင့် တည်ဆောက်ထားသည့် React client ဖြစ်သည်။

---

### ထူးခြားချက်များ
- **လုံခြုံစိတ်ချရသော JWT စနစ်**: အကောင့်ဖွင့်ခြင်း၊ Login ဝင်ခြင်း၊ Token သက်တမ်းကုန်ပါက Refresh Token ဖြင့် အလိုအလျောက် Token အသစ် လဲလှယ်ပေးခြင်း (Refresh Rotation) နှင့် Logout ပြုလုပ်ပါက token ဖျက်သိမ်းခြင်းများ ပါဝင်သည်။
- **Real-Time စကားပြောခြင်း (SignalR)**: စာတိုများ ချက်ချင်း အပြန်အလှန် ပေးပို့နိုင်ခြင်း၊ တစ်ဖက်လူ စာရိုက်နေပါက `test_user is typing...` ဟု ပြသပေးခြင်းနှင့် User Presence Status (Active Now သို့မဟုတ် Offline ဖြစ်နေသည်ကို တိုက်ရိုက်ပြသပေးခြင်း)။
- **Database နှစ်မျိုး ပူးတွဲအသုံးပြုခြင်း**:
  - **MSSQL**: အသုံးပြုသူများ (ASP.NET Core Identity)၊ သူငယ်ချင်းဆက်သွယ်မှုများ (Friendships) နှင့် Chat Group များ၏ အချက်အလက်များကို သိမ်းဆည်းရန်။
  - **MongoDB**: Chat Message အဟောင်းများနှင့် data များကို အလွန်မြန်ဆန်စွာ သိမ်းဆည်းဖတ်ရှုနိုင်ရန်။
- **Scalar API Documentation**: API endpoint များကို ဝဘ်ဘရောက်ဇာပေါ်မှ တိုက်ရိုက် စမ်းသပ်စစ်ဆေးနိုင်ရန် ခေတ်မီလှပသော Scalar UI စာမျက်နှာကို ထည့်သွင်းပေးထားသည်။
- **သူငယ်ချင်းများကို အလွယ်တကူ ရှာဖွေနိုင်ခြင်း**: သူငယ်ချင်းများကို ရှာဖွေရာတွင် ရှုပ်ထွေးသော User GUID များ ရိုက်ထည့်ရန်မလိုဘဲ `Username` သို့မဟုတ် `Full Name` ရိုက်ထည့်ရုံဖြင့် အလွယ်တကူ ရှာဖွေနိုင်ပါသည်။ ရှာဖွေတွေ့ရှိသူများ၏ ဘေးတွင် Friendship status ပေါ်မူတည်၍ ခလုတ်များ (Add, Pending, Chat) ကို အလိုအလျောက် ဖော်ပြပေးမည် ဖြစ်သည်။

---

### စနစ်လည်ပတ်ရန် လိုအပ်ချက်များ
- **.NET 10 SDK**
- **Node.js (v18 သို့မဟုတ် ၎င်းထက်မြင့်သော version)**
- **Microsoft SQL Server** (LocalDB သို့မဟုတ် SQL Express/Developer local instance)
- **MongoDB** (လိပ်စာ `mongodb://localhost:27017` တွင် run ထားရန်)

---

### စနစ်အား စတင်လည်ပတ်ပုံ (How to Run)

#### ၁။ Backend စတင်ခြင်း (`VeloChat.WebAPI`)
1. Terminal အသစ်တစ်ခု ဖွင့်ပြီး Backend folder ထဲသို့ ဝင်ပါ:
   ```powershell
   cd VeloChat.WebAPI
   ```
2. Database ချိတ်ဆက်မှု လိပ်စာများကို `appsettings.json` တွင် လိုအပ်သလို ပြင်ဆင်ပါ:
   - **SQL Server Connection**: `Server=localhost;Database=Velo_Chat;User Id=sa;Password=Password@123;TrustServerCertificate=True`
   - **MongoDB Connection**: `mongodb://localhost:27017`
3. SQL Database tables များ တည်ဆောက်ရန် Migration run ပေးပါ:
   ```powershell
   dotnet ef database update
   ```
4. Backend API ကို စတင်ပါ:
   ```powershell
   dotnet run
   ```
   Backend သည် `https://localhost:7010` တွင် စတင်လည်ပတ်မည် ဖြစ်သည်။
5. ဘရောက်ဇာတွင် `https://localhost:7010/scalar/v1` သို့ သွားရောက်ပြီး API docs များကို လေ့လာစမ်းသပ်နိုင်သည်။

#### ၂။ Frontend စတင်ခြင်း (`VeloChat.Client`)
1. Terminal အသစ်တစ်ခု ထပ်မံဖွင့်ပြီး Frontend folder ထဲသို့ ဝင်ပါ:
   ```powershell
   cd VeloChat.Client
   ```
2. Packages များ ထည့်သွင်းပါ:
   ```powershell
   npm install
   ```
3. Vite Development Server ကို စတင်ပါ:
   ```powershell
   npm run dev
   ```
4. ဘရောက်ဇာတွင် `http://localhost:5173` သို့ သွားရောက်ပြီး Chat Application အား စတင်အသုံးပြုနိုင်ပါပြီ။
