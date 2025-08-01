import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const NeighborhoodDataSheet = () => {
  const { name: encodedName } = useParams();
  const name = decodeURIComponent(encodedName);
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [previewFeature, setPreviewFeature] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const years = Array.from({ length: 2024 - 2016 + 1 }, (_, i) => 2016 + i);

  useEffect(() => {
    const fetchData = async () => {
      const results = [];
      let feature = null;

      for (let year of years) {
        try {
          const res = await fetch(`/data/atlanta_${year}.geojson`);
          const geo = await res.json();
          const match = geo.features.find(f => f.properties.NAME === name);
          if (match && match.properties.avgprice > 0) {
            if (!feature) feature = match;
            const props = match.properties;
            results.push({
              year,
              avgprice: props.avgprice,
              medianprice: props.medianprice,
              parcels: props.parcels,
            });
          }
        } catch (err) {
          console.error(`Failed to load data for ${year}:`, err);
        }
      }

      setData(results);
      setPreviewFeature(feature);
      setLoading(false);
    };

    fetchData();
  }, [name]);

  useEffect(() => {
    if (!previewFeature || !mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      interactive: false,
      center: [-84.388, 33.749], // Atlanta downtown
      zoom: 10
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("preview", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [previewFeature]
        }
      });

      map.addLayer({
        id: "preview-fill",
        type: "fill",
        source: "preview",
        paint: {
          "fill-color": "#2c7fb8",
          "fill-opacity": 0.6
        }
      });

      if (previewFeature.geometry && previewFeature.geometry.coordinates) {
        const bounds = new mapboxgl.LngLatBounds();
        const coords = previewFeature.geometry.coordinates;

        const addCoords = (ring) => {
          ring.forEach(coord => {
            if (coord.length === 2) bounds.extend(coord);
          });
        };

        if (previewFeature.geometry.type === "Polygon") {
          addCoords(coords[0]);
        } else if (previewFeature.geometry.type === "MultiPolygon") {
          coords.forEach(polygon => {
            if (Array.isArray(polygon)) addCoords(polygon[0]);
          });
        }

        map.fitBounds(bounds, { padding: 20 });
        map.resize();
      }
    });
  }, [previewFeature]);

  if (loading) return <div style={{ padding: "1rem" }}>Loading data for {name}...</div>;

  if (data.length === 0) {
    return (
      <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
        <button onClick={() => navigate("/")} style={{ marginBottom: "1rem" }}>← Back to Map</button>
        <h1>{name} Neighborhood Data Sheet</h1>
        <p>There have been no residential sales in this neighborhood.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: "1rem" }}>← Back to Map</button>
      <h1>{name}</h1>

      <div
        ref={mapContainerRef}
        style={{ height: "350px", width: "100%", marginBottom: "1.5rem", border: "1px solid #ccc", borderRadius: "8px" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
        <div><strong>Start Year:</strong> {data[0].year}</div>
        <div><strong>End Year:</strong> {data[data.length - 1].year}</div>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Price Trends</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip formatter={value => `$${parseInt(value).toLocaleString()}`} />
          <Line type="monotone" dataKey="avgprice" stroke="#8884d8" name="Avg Price" />
          <Line type="monotone" dataKey="medianprice" stroke="#82ca9d" name="Median Price" />
        </LineChart>
      </ResponsiveContainer>

      <h2 style={{ marginTop: "2rem" }}>Yearly Data</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Year</th>
            <th>Avg Price</th>
            <th>Median Price</th>
            <th>Sales Volume</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td>${row.avgprice.toLocaleString()}</td>
              <td>${row.medianprice.toLocaleString()}</td>
              <td>{row.parcels}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => navigate(`/compare?primary=${encodeURIComponent(name)}`)}
        style={{
          marginTop: "2rem",
          padding: "0.6rem 1rem",
          fontSize: "1rem",
          backgroundColor: "#2c7fb8",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Compare Neighborhoods
      </button>
    </div>
  );
};

export default NeighborhoodDataSheet;