# Lalendar Web UI

## Environment Variables

The frontend only reads public coordinate values:

```env
VITE_WEATHER_NX=60
VITE_WEATHER_NY=127
```

API keys and tokens never use the `VITE_` prefix. They are read only inside Vercel Serverless Functions through `process.env`.
Weather data is loaded through the Vercel Serverless Function at `/api/weather`.
ThinQ data is loaded through internal Vercel Serverless Functions under `/api/thinq`.

Register the same server-only values in Vercel Dashboard -> Settings -> Environment Variables:

```env
WEATHER_API_KEY=
THINQ_PAT=
THINQ_CLIENT_ID=
THINQ_COUNTRY=KR
THINQ_API_BASE_URL=https://api-kic.lgthinq.com
THINQ_API_KEY=
```

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
```
