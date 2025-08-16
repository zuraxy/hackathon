export type HazardRecord = {
  lat: number;
  lon: number;
  type: string;
  description?: string;
  createdAt?: string;
  userId?: string;
  _id?: string;
};

// Configure your backend base URL (env override, else deployed Render URL)
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://hackathon-6rqo.onrender.com';

// Return hazards in the app's shape: description always present (string)
export async function fetchHazardsNear(
  lat: number,
  lon: number,
  radius = 3000
): Promise<{ lat: number; lon: number; type: string; description: string }[]> {
  const url = `${API_BASE}/getHazards?lat=${lat}&lon=${lon}&radius=${radius}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchHazardsNear failed: ${res.status}`);
  const json: HazardRecord[] = await res.json();
  return json.map((h) => ({
    lat: h.lat,
    lon: h.lon,
    type: h.type,
    description: h.description ?? '',
  }));
}

export async function createHazard(h: { lat: number; lon: number; type: string; description?: string }) {
  const res = await fetch(`${API_BASE}/addHazards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(h),
  });
  if (!res.ok) throw new Error(`createHazard failed: ${res.status}`);
  return res.json();
}
