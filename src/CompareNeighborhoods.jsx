import React, { useEffect, useState } from "react";
import styles from "./CompareNeighborhoods.module.css";
import Select from "react-select";

import { useSearchParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const CompareNeighborhoods = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const primary = searchParams.get("primary");
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selected, setSelected] = useState(primary ? [primary] : []);
  const [datasets, setDatasets] = useState({});
  const [loading, setLoading] = useState(false);
  const years = Array.from({ length: 2024 - 2016 + 1 }, (_, i) => 2016 + i);
  const colorPalette = ["#8884d8", "#82ca9d", "#ff7300", "#ff6384", "#36a2eb"];

  const fetchNames = async () => {
    try {
      const res = await fetch(`/data/atlanta_2023.geojson`);
      const geo = await res.json();
      const names = geo.features.map(f => f.properties.NAME).sort();
      setNeighborhoods(names);
    } catch (err) {
      console.error("Failed to load neighborhood names", err);
    }
  };

  const fetchData = async (name) => {
    const results = [];
    for (let year of years) {
      try {
        const res = await fetch(`/data/atlanta_${year}.geojson`);
        const geo = await res.json();
        const match = geo.features.find(f => f.properties.NAME === name);
        if (match && match.properties.avgprice > 0) {
          const props = match.properties;
          results.push({
            year,
            avgprice: props.avgprice,
            medianprice: props.medianprice,
            parcels: props.parcels,
          });
        }
      } catch (err) {
        console.error("Error loading", name, err);
      }
    }
    return results;
  };

  const handleSelect = async (selectedOptions) => {
    // react-select passes the selected options directly
    // selectedOptions will be an array of selected values or an object if not multi-select

    // If it's a multi-select and nothing is selected, selectedOptions will be null or undefined
    // Ensure selectedOptions is an array before calling map
    const values = Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : selectedOptions ? [selectedOptions.value] : [];


    if (values.length > 5) return;

    setSelected(values);
    setLoading(true);

    const newData = {};
    for (let name of values) {
      newData[name] = await fetchData(name);
    }

    setDatasets(newData);
    setLoading(false);
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchNames(); // ensure names are loaded first
      if (primary) {
        handleSelect([{ value: primary, label: primary }]);
      }
    };
    initialize();
  }, []);

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: "1rem" }}>← Back</button>
      <h1>Compare Neighborhoods</h1>

      <label htmlFor="compare-select">Select up to 5 neighborhoods:</label>
      <Select
        isMulti
        options={neighborhoods.map(n => ({ value: n, label: n }))}
        value={neighborhoods
          .filter(n => selected.includes(n))
          .map(n => ({ value: n, label: n }))}
        onChange={handleSelect}
        placeholder="Select neighborhoods (max 5)..."
        isClearable
        closeMenuOnSelect={true}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "2rem",
          width: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{ flex: "1 1 48%", minWidth: "300px" }}>
            <h2>Average Price</h2>
            <ResponsiveContainer width="100%" height={350}>
            <LineChart data={years.map(y => ({ year: y }))} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" domain={[2016, 2024]} type="number" />
              <YAxis />
              <Tooltip formatter={value => `$${parseInt(value).toLocaleString()}`} />
              <Legend verticalAlign="bottom" />
              {selected.map((n, idx) =>
                datasets[n] ? (
                  <Line
                    key={n}
                    data={datasets[n]}
                    type="monotone"
                    dataKey="avgprice"
                    stroke={colorPalette[idx % colorPalette.length]}
                    name={n}
                    dot={false}
                  />
                ) : null
              )}
            </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ flex: "1 1 48%", minWidth: "300px" }}>
            <h2>Sales Volume</h2>
            <ResponsiveContainer width="100%" height={350}>
            <LineChart data={years.map(y => {
              const entry = { year: y };
              for (let n of selected) {
                const match = datasets[n]?.find(d => d.year === y);
                entry[n] = match?.parcels || 0;
              }
              return entry;
            })} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" domain={[2016, 2024]} type="number" />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="bottom" />
              {selected.map((n, idx) =>
                datasets[n] ? (
                  <Line
                    key={n + "-parcels"}
                    type="monotone"
                    dataKey={n}
                    stroke={colorPalette[idx % colorPalette.length]}
                    name={n}
                    dot={false}
                  />
                ) : null
              )}
            </LineChart>
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default CompareNeighborhoods;