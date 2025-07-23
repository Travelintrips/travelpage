// File: pages/api/route.ts
export default async function handler(req, res) {
  const { from, to } = req.query;

  const url = `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=false&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch route", detail: error });
  }
}
