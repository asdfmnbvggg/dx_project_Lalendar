const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

let googleIdentityScriptPromise = null;

export async function importGoogleCalendarEvents({ timeMin, timeMax, maxResults = 80 } = {}) {
  const accessToken = await requestGoogleCalendarAccessToken();
  return fetchGoogleCalendarEvents({ accessToken, timeMin, timeMax, maxResults });
}

async function requestGoogleCalendarAccessToken() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw createGoogleCalendarError("CLIENT_ID_MISSING", "Google Calendar 연동을 위해 VITE_GOOGLE_CLIENT_ID가 필요해요.");
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response?.error) {
          reject(createGoogleCalendarError(response.error, response.error_description || "Google Calendar 권한을 받을 수 없어요."));
          return;
        }

        if (!response?.access_token) {
          reject(createGoogleCalendarError("ACCESS_TOKEN_MISSING", "Google Calendar 접근 토큰을 받지 못했어요."));
          return;
        }

        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(createGoogleCalendarError(error?.type || "OAUTH_ERROR", "Google Calendar 연동 창을 열 수 없어요."));
      },
    });

    tokenClient.requestAccessToken();
  });
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(createGoogleCalendarError("SCRIPT_LOAD_FAILED", "Google Identity 스크립트를 불러오지 못했어요."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

async function fetchGoogleCalendarEvents({ accessToken, timeMin, timeMax, maxResults }) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax || getFutureDateIso(90),
  });

  const response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw createGoogleCalendarError("EVENTS_FETCH_FAILED", detail || "Google Calendar 일정을 가져오지 못했어요.");
  }

  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

async function readErrorDetail(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || "";
  } catch {
    return "";
  }
}

function getFutureDateIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createGoogleCalendarError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
