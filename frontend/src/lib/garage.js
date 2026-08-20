import axios from "axios";
import { apiBaseUrl } from "./api";

const client = axios.create({ baseURL: apiBaseUrl, timeout: 30000 });

export async function myBuilds(authHeader) {
  const { data } = await client.get("/builds/mine", { headers: authHeader });
  return data.builds;
}

export async function removeBuild(code, authHeader) {
  await client.delete(`/builds/${code}`, { headers: authHeader });
}
