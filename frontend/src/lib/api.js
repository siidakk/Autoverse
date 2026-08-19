import axios from "axios";

export const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// The API sleeps on a free tier, so requests are given room rather than being
// cut off while it wakes up.
const client = axios.create({ baseURL: apiBaseUrl, timeout: 90000 });

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
