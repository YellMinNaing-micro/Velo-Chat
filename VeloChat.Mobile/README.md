# Velo Chat Mobile

Expo SDK 57 / React Native client for the existing Velo Chat API.

## Included flows

- Native Velo app icon and splash screen
- Splash-time refresh-token rotation and profile restore
- Tokens stored with Expo SecureStore
- Login, registration, protected navigation and logout/revoke
- Chat list, friend matches, user search, friend requests and direct messages
- SignalR conversation history, live messages and typing state
- Profile editing

## Run locally

1. Start the API over development HTTP so a device can reach it:

   ```powershell
   dotnet run --project ..\VeloChat.WebAPI --urls http://0.0.0.0:5027
   ```

2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`:

   - Android emulator: `http://10.0.2.2:5027`
   - iOS simulator: `http://localhost:5027`
   - Physical phone: `http://<computer-LAN-IP>:5027`

3. Install and launch:

   ```powershell
   npm install
   npm run android
   ```

Use `npm run ios` on macOS or `npm run web` for the browser target. Check the native splash in a release/internal build because Expo Go does not render the production splash screen exactly.

## Quality checks

```powershell
npm run typecheck
npm run lint
npx expo export --platform web
```
