import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const NeighborhoodDataSheet = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const years = Array.from({ length: 2024 - 2016 + 1 }, (_, i) => 2016 + i);

  useEffect(() => {
    const fetchData = async () => {
      const results = [];
      for (let year of years) {
        try {
          const res = await fetch(`/data/atlanta_${year}.geojson`);
          const geo = await res.json();
          const match = geo.features.find(f => f.properties.NAME === name);
          if (match) {
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
      setLoading(false);
    };
    fetchData();
  }, [name]);

  if (loading) return <div style={{ padding: "1rem" }}>Loading data for {name}...</div>;

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: "1rem" }}>← Back to Map</button>
      <h1>{name} Neighborhood Data Sheet</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
        {data.length > 0 && (
          <>
            <div><strong>Start Year:</strong> {data[0].year}</div>
            <div><strong>End Year:</strong> {data[data.length - 1].year}</div>
            <div><strong>Latest Avg Price:</strong> ${data[data.length - 1].avgprice.toLocaleString()}</div>
            <div><strong>Latest Median Price:</strong> ${data[data.length - 1].medianprice.toLocaleString()}</div>
            <div><strong>Latest Parcels:</strong> {data[data.length - 1].parcels}</div>
          </>
        )}
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
            <th>Parcels</th>
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