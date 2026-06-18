# L-lander Web UI

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
