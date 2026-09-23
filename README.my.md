# VeloChat

VeloChat သည် ASP.NET Core 10၊ SignalR၊ React/Vite နှင့် Expo React Native ဖြင့် ရေးထားသော web နှင့် mobile chat app ဖြစ်သည်။ Account၊ friendship နှင့် chat room အချက်အလက်ကို SQL Server တွင် သိမ်းပြီး message များကို MongoDB တွင် သိမ်းသည်။ [English README](./README.md)။

## လက်ရှိလုပ်ဆောင်ချက်များ

- အကောင့်ဖွင့်ခြင်း၊ login၊ token refresh၊ profile ပြင်ခြင်းနှင့် password ပြောင်းခြင်း
- Friend ရှာခြင်းနှင့် request ပို့ခြင်း၊ တိုက်ရိုက် chat၊ online status နှင့် typing indicator
- Web၊ Android/iOS client များနှင့် light/dark theme
- Message history ကြည့်ခြင်းနှင့် SignalR room action များအတွက် room membership စစ်ဆေးခြင်း

Message history သည် **နောက်ဆုံး message ၁၀၀** ကို အဟောင်းမှအသစ်သို့ ပြသသည်။ စာဟောင်းများကို page ခွဲယူခြင်း၊ read receipt၊ push notification နှင့် file upload မရှိသေးပါ။ Room ဖန်တီးသူသည် ကနဦးတစ်ဦးတည်းသော member ဖြစ်သည်။ `POST /api/chatrooms/{roomId}/join` မှတစ်ဆင့် တခြားသူ၏ room ထဲကို တန်းဝင်၍မရတော့ပါ။ Group chat တွင် member ထပ်ထည့်ရန် invitation flow လိုအပ်သည်။

## လိုအပ်ချက်များ

.NET 10 SDK၊ Node.js 18+၊ pnpm 10၊ SQL Server နှင့် MongoDB လိုအပ်သည်။ Mobile စမ်းရန် Expo Go သို့မဟုတ် Android/iOS emulator လိုအပ်သည်။

## စက်အတွင်း စတင်အသုံးပြုခြင်း

API development configuration တွင် SQL Server၊ MongoDB connection string နှင့် JWT setting များကို သတ်မှတ်ပါ။ Production secret များကို repository ထဲ မသိမ်းပါနှင့်။ Repository root မှာ:

```powershell
dotnet ef database update --project VeloChat.WebAPI
dotnet run --project VeloChat.WebAPI --launch-profile https
```

နောက် terminal တစ်ခုမှာ:

```powershell
pnpm install
pnpm web
```

Web client ကို `http://localhost:5173` တွင် ဖွင့်နိုင်သည်။ Local HTTPS API သည် `https://localhost:7010` ဖြစ်ပြီး Development အချိန် Scalar API docs ကို `https://localhost:7010/scalar/v1` တွင် ကြည့်နိုင်သည်။

## ဖုန်းအစစ်ဖြင့် စမ်းခြင်း

ဖုန်းနှင့် development PC ကို Wi-Fi တစ်ခုတည်း ချိတ်ပါ။ `VeloChat.Mobile/.env.example` ကို `VeloChat.Mobile/.env` အဖြစ် copy လုပ်ပြီး `EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:5027` ဟု သတ်မှတ်ပါ။ `pnpm mobile --clear --lan` ဖြင့် ဖွင့်ပြီး Expo Go တွင် QR code ကို scan လုပ်ပါ။ Port 5027 HTTP သည် local Development စမ်းသပ်မှုအတွက်ဖြစ်သည်။ Production တွင် valid certificate ပါသော HTTPS သုံးပါ။

Android emulator အတွက် `http://10.0.2.2:5027`၊ iOS simulator အတွက် `http://localhost:5027` ကို သုံးပါ။ `.env` ပြောင်းပြီးတိုင်း Expo ကို restart လုပ်ပါ။

## စစ်ဆေးရန်

```powershell
dotnet build VeloChat.WebAPI/VeloChat.WebAPI.csproj
pnpm build
pnpm typecheck
```

ဖုန်းဖြင့် စမ်းသပ်နည်း အသေးစိတ်ကို [Mobile README](./VeloChat.Mobile/README.md) တွင် ကြည့်နိုင်သည်။
