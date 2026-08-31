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

// What the recommender actually holds: the fuels, bodies and seat counts that
// exist in the catalogue, plus who the data belongs to.
//
// Worth fetching rather than hard coding, as the last change proved. The form
// had a fixed list written when the data was a scrape of 2020 used listings,
// so it went on offering LPG, which nothing in the new catalogue is, and had
// no way at all to ask for Electric or Hybrid, which twenty seven and eight of
// them are. A list of options that disagrees with the data is a search that
// returns nothing for no visible reason.
export async function catalogueMeta() {
  try {
    const { data } = await axios.get(`${mlBaseUrl}/meta`, { timeout: 90000 });
    return data;
  } catch {
    // The page has sensible defaults and this only ever enriches them, so a
    // sleeping service should not stop anybody searching.
    return null;
  }
}

// Valuation takes the same route as recommendations: API first, recommender
// directly if the API cannot be reached.
export async function valuationOptions() {
  try {
    const { data } = await client.get("/valuation/options");
    return data;
  } catch (proxyError) {
    if (proxyError.response && proxyError.response.status < 500) throw proxyError;

    const { data } = await axios.get(`${mlBaseUrl}/valuation/options`, {
      timeout: 90000
    });
    return data;
  }
}

export async function valueCar(details) {
  try {
    const { data } = await client.post("/valuation", details);
    return data;
  } catch (proxyError) {
    if (proxyError.response && proxyError.response.status < 500) throw proxyError;

    const { data } = await axios.post(`${mlBaseUrl}/valuation`, details, {
      timeout: 90000
    });
    return data;
  }
}

export async function saveBuild(payload, headers = {}) {
  const { data } = await client.post("/builds", payload, { headers });
  return data;
}

export async function loadBuild(code) {
  const { data } = await client.get(`/builds/${code}`);
  return data;
}

export function describeError(error) {
  const data = error.response?.data;

  // A failure that will fix itself on its own says so, and its own wording is
  // more specific than anything that can be inferred from a status code. This
  // has to come first: a 503 used to be reported as the database being
  // disconnected even when it was the ML service coming back from idle.
  if (data?.waking) return data.message || data.error;

  if (error.response?.status === 503) {
    return "Saving is off right now — the database is not connected.";
  }
  if (error.response?.status === 404) {
    return "No build found with that code.";
  }
  if (error.code === "ECONNABORTED") {
    return "That took too long. The API sleeps when idle, so try again.";
  }
  return data?.error || data?.message || "Could not reach the API.";
}
