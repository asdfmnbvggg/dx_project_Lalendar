# L-lander Web UI

## Together AI task recommendations

When a user adds a personal calendar event, the app sends the event time and
available weather/PM10 values to `/api/predict-task`. The Vercel serverless
function calls Together AI and adds the returned housework task to the
calendar.

Configure these server-side environment variables in Vercel:

```text
TOGETHER_API_KEY=your_together_api_key
TOGETHER_MODEL=Qwen/Qwen3.5-9B
```

`TOGETHER_MODEL` can be replaced with a fine-tuned Together model name.
Do not use a `VITE_` prefix for the API key.

## Daily AI Report

`/api/daily-report` creates the calendar report from the selected date's
three-day schedules, chores, and weather. OpenAI is the default provider and
Together is used as a fallback when the OpenAI request fails.

Configure these server-side environment variables in Vercel:

```text
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
TOGETHER_API_KEY=your_together_api_key
TOGETHER_MODEL=Qwen/Qwen3.5-9B
```

Never prefix either API key with `VITE_`.

## Environment Variables

The weather and air-quality services are called from the Vite frontend with public `VITE_` variables:

```env
VITE_WEATHER_SERVICE_KEY=
VITE_MID_WEATHER_SERVICE_KEY=
VITE_AIR_SERVICE_KEY=

VITE_WEATHER_NX=59
VITE_WEATHER_NY=126
VITE_MID_LAND_REG_ID=11B00000
VITE_MID_TEMP_REG_ID=11B10101
VITE_AIR_QUALITY_SIDO=서울
VITE_AIR_QUALITY_STATION=
```

Services:

```txt
Web_ui/src/services/weatherService.js       short-term forecast
Web_ui/src/services/midWeatherService.js    mid-term forecast
Web_ui/src/services/airQualityService.js    air quality / fine dust
```

ThinQ API integration has been removed from the app.

## Local Development

```bash
npm run dev
npm run build
```
