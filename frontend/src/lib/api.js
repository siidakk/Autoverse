import axios from "axios";

export const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// The recommender can also be reached without going through the API. Free tier
// services sleep, get suspended and cold start independently, and there is no
// reason the one feature people come for should die because the proxy in front
// of it is asleep.
export const mlBaseUrl = (
  import.meta.env.VITE_ML_URL || "http://localhost:8000"
).replace(/\/$/, "");

// The API sleeps on a free tier, so requests are given room rather than being
// cut off while it wakes up.
const client = axios.create({ baseURL: apiBaseUrl, timeout: 90000 });

// Asks the API first, because that is the architecture, and falls back to the
// recommender itself if the API cannot be reached. Returns which one answered
// so the page can be honest about it.
export async function recommend(preferences) {
  try {
    const { data } = await client.post("/ml", preferences);
    return { data, direct: false };
  } catch (proxyError) {
    const reachable = proxyError.response && proxyError.response.status < 500;

    // A real answer from the API, even a bad one, is not something to route
    // around. Only a dead or unreachable proxy is.
    if (reachable) throw proxyError;

    const { data } = await axios.post(`${mlBaseUrl}/recommend`, preferences, {
      timeout: 90000
    });

    return { data, direct: true };
  }
}

export async function saveBuild(payload) {
  const { data } = await client.post("/builds", payload);
  return data;
}

export async function loadBuild(code) {
  const { data } = await client.get(`/builds/${code}`);
  return data;
}

export function describeError(error) {
  if (error.response?.status === 503) {
    return "Saving is off right now — the database is not connected.";
  }
  if (error.response?.status === 404) {
    return "No build found with that code.";
  }
  if (error.code === "ECONNABORTED") {
    return "That took too long. The API sleeps when idle, so try again.";
  }
  return error.response?.data?.error || "Could not reach the API.";
}
