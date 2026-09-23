# VeloChat

VeloChat is a web and mobile messaging app built with ASP.NET Core 10, SignalR, React/Vite, and Expo React Native. SQL Server stores accounts, friendships, and rooms; MongoDB stores messages. [မြန်မာဘာသာ README](./README.my.md).

## Current features

- Registration, login, token refresh, profile editing, and password changes
- Friend search and requests, direct messages, group creation and adding accepted friends, online presence, and typing indicators
- Web and Android/iOS clients with light and dark themes
- Room membership checks for message history and SignalR room actions
- Older-message loading and unread counts that clear when a room is opened

Message history loads **50 messages per page** (up to 100 via the API) in chronological display order. Group members can add accepted friends; this adds them immediately, without a separate invitation acceptance step. Read receipts per message, push notifications, and file uploads are not implemented. `POST /api/chatrooms/{roomId}/join` does not allow arbitrary users to join.

## Requirements

.NET 10 SDK, Node.js 18+, pnpm 10, SQL Server, and MongoDB. Mobile testing requires Expo Go or an Android/iOS emulator.

## Local setup

Set the SQL Server and MongoDB connection strings and JWT settings in the API development configuration. Keep production secrets outside the repository. From the repository root:

```powershell
dotnet ef database update --project VeloChat.WebAPI
dotnet run --project VeloChat.WebAPI --launch-profile https
```

In another terminal:

```powershell
pnpm install
pnpm web
```

Open `http://localhost:5173`. The local HTTPS API is at `https://localhost:7010`; Scalar API docs are at `https://localhost:7010/scalar/v1` in Development.

Run the migration command above after pulling these changes; it adds `LastReadAt` to room memberships for unread counts.

## Mobile on a physical device

Connect the phone and development PC to the same Wi-Fi network. Copy `VeloChat.Mobile/.env.example` to `VeloChat.Mobile/.env`, then set `EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:5027`. Start with `pnpm mobile --clear --lan` and scan the QR code in Expo Go. Port 5027 is an HTTP listener for local Development testing; use HTTPS with a valid certificate in production.

For Android emulator use `http://10.0.2.2:5027`; for iOS simulator use `http://localhost:5027`. Restart Expo after changing `.env`.

## Checks

```powershell
dotnet build VeloChat.WebAPI/VeloChat.WebAPI.csproj
pnpm build
pnpm typecheck
```

See [mobile setup](./VeloChat.Mobile/README.md) for more device instructions.
