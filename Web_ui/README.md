# Lalendar Web UI

## Environment Variables

The frontend only reads public coordinate values:

```env
VITE_WEATHER_NX=59
VITE_WEATHER_NY=126
```

API keys and tokens never use the `VITE_` prefix. They are read only inside Vercel Serverless Functions through `process.env`.
Weather data is loaded through the Vercel Serverless Function at `/api/weather`. The weather function uses short-term `getVilageFcst` for today through 3 days later, and mid-term `getMidLandFcst` plus `getMidTa` for 4 through 10 days later.
ThinQ data is loaded through internal Vercel Serverless Functions under `/api/thinq`.

For local development, run the app through Vercel so `/api/*` serverless functions are available:

```bash
npm run dev:vercel
```

Running only `npm run dev` starts the Vite frontend server. It serves `/api/weather` through a local development middleware, but it does not serve `/api/thinq/*`.
For local serverless testing, make sure the server-only variables are also available locally, for example by running `vercel env pull .env.local` or by adding them to a gitignored local env file without the `VITE_` prefix.

Register these values in Vercel Dashboard -> Settings -> Environment Variables:

```env
WEATHER_API_KEY=
VITE_WEATHER_NX=59
VITE_WEATHER_NY=126
MID_LAND_REG_ID=11B00000
MID_TEMP_REG_ID=11B10101
THINQ_PAT=
THINQ_CLIENT_ID=
THINQ_COUNTRY=KR
THINQ_API_BASE_URL=https://api-kic.lgthinq.com
THINQ_FIXED_API_KEY=
```

ThinQ에서 사용자가 직접 발급받는 값은 `THINQ_PAT`뿐입니다. `THINQ_FIXED_API_KEY`는 개인 발급 API key가 아니라 LG ThinQ OpenAPI 문서에 공개된 고정 `x-api-key` 헤더값입니다.
ThinQ server-only values, including `THINQ_PAT` and `THINQ_FIXED_API_KEY`, must stay server-only and must not use the `VITE_` prefix.

Do not commit real keys or tokens to git. After adding or changing values in Vercel Dashboard -> Settings -> Environment Variables, redeploy the Vercel project so the serverless functions receive the new values.

Frontend internal API routes:

```txt
GET /api/weather?nx={nx}&ny={ny}
```

ThinQ internal API routes:

```txt
GET /api/thinq/devices
GET /api/thinq/devices/{deviceId}/state
POST /api/thinq/devices/{deviceId}/control
POST /api/thinq/devices/{deviceId}/event/subscribe
POST /api/thinq/devices/{deviceId}/push/subscribe
GET /api/thinq/devices/{deviceId}/energy
```
