import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Slider } from "@mui/material";
import * as d3 from "d3";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function AtlantaPropertyMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [year, setYear] = useState(2024);
  const [geoData, setGeoData] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const legendRef = useRef(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-84.41, 33.765],
      zoom: isMobile ? 9.5 : 10.2,
    });

    map.current.on("load", () => {
      setYear(2024);
    });
  }, [isMobile]);

  useEffect(() => {
    setLoading(true);
    fetch(`/data/atlanta_${year}.geojson`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        data.features.forEach(f => {
          const price = f.properties?.avgprice;
          f.properties.avgprice_log10 = price && price > 0 ? Math.log10(price) : -1;
        });
        setGeoData(data);
        if (map.current.getSource("nbhd")) {
          map.current.getSource("nbhd").setData(data);
        } else {
          map.current.addSource("nbhd", {
            type: "geojson",
            data,
          });
          map.current.addLayer({
            id: "nbhd-fill",
            type: "fill",
            source: "nbhd",
            paint: {
              "fill-color": [
              "case",
              ["<", ["get", "avgprice_log10"], 0], "#999999",
                [
                "interpolate",
                ["linear"],
                ["get", "avgprice_log10"],
                4.7, "#00007F",
                5.0, "#002EFF",
                5.3, "#00FFFF",
                5.6, "#7FFF00",
                5.9, "#FFFF00",
                6.2, "#FF7F00",
                6.41, "#FF0000"
                ]
              ],  
              "fill-opacity": 0.6,
            },
          });
          map.current.addLayer({
            id: "nbhd-outline",
            type: "line",
            source: "nbhd",
            paint: {
              "line-color": "#555",
              "line-width": 1,
            },
          });
        }
      })
      .catch(err => console.error('Failed to load geojson:', err))
      .finally(() => setLoading(false)); 
  }, [year]);

  useEffect(() => {
    let interval;
    if (playing) {
      interval = setInterval(() => {
        setYear(prev => (prev < 2024 ? prev + 1 : 2016));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [playing]);

  useEffect(() => {
    if (!map.current) return;

    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

    function handleMouseMove(e) {
      const layerExists = map.current.getLayer("nbhd-fill");
      if (!layerExists) return;

      const features = map.current.queryRenderedFeatures(e.point, { layers: ["nbhd-fill"] });
      if (features.length > 0) {
        const feature = features[0];
        const { NAME, nbhd_name, avgprice, medianprice, parcels } = feature.properties;
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>${NAME}</strong><br/>
            Avg Price: $${parseInt(avgprice).toLocaleString()}<br/>
            Median Price: $${parseInt(medianprice).toLocaleString()}<br/>
            Parcels: ${parcels}
          `)
          .addTo(map.current);
      } else {
        popup.remove();
      }
    }

    map.current.on("mousemove", handleMouseMove);
    map.current.on("mouseleave", "nbhd-fill", () => popup.remove());

    return () => {
      map.current.off("mousemove", handleMouseMove);
      popup.remove();
    };
  }, [geoData]);

  useEffect(() => {
    if (!legendRef.current) return;
    const svg = d3.select(legendRef.current);
    svg.selectAll("*").remove();

    const width = 500;
    const height = 30;
    const margin = { top: 10, bottom: 10 };
    const svgWidth = parseInt(svg.attr("width"));
    const gradientX = (svgWidth - width) / 2;

    const scale = d3.scaleLog()
      .domain([50000, 2600000])
      .range([0, width]);

    const color = d3.scaleSequential()
      .domain([4.7, 6.41])
      .interpolator(d3.interpolateTurbo);

    const gradientId = "color-gradient";
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    const stops = [4.7, 5.0, 5.3, 5.6, 5.9, 6.2, 6.41];
    stops.forEach((d, i) => {
      gradient.append("stop")
        .attr("offset", `${(i / (stops.length - 1)) * 100}%`)
        .attr("stop-color", color(d));
    });

    svg.append("rect")
    .attr("x", gradientX)
    .attr("y", margin.top)
    .attr("width", width)
    .attr("height", height )
    .style("fill", `url(#${gradientId})`);  

    const axis = d3.axisBottom(scale)
      .tickValues([50000, 100000, 200000, 400000, 800000, 1600000, 2600000])
      .tickFormat(d => `$${d3.format("~s")(d)}`);

    const axisGroup = svg.append("g")
    .attr("transform", `translate(${gradientX},${height + margin.bottom})`)
    .call(axis);
  
    // Style the axis text
    axisGroup.selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#333");
    
    // Add axis title
    svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#333")
    .text("Median Sale Price ($)");     
  }, [year]);

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: isMobile ? "0.5rem" : "1rem", backgroundColor: "white", zIndex: 10 }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center" }}>
          <h2 style={{ fontSize: isMobile ? "1.2rem" : "1.5rem" }}>Atlanta Property Map ({year})</h2>
          <button style={{ marginTop: isMobile ? "0.5rem" : 0 }} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>
        </div>
        <Slider
          min={2016}
          max={2024}
          value={year}
          onChange={(e, val) => setYear(val)}
          marks
        />
        <svg
          ref={legendRef}
          width="550"
          height="60"
          style={{ display: "block", margin: "1rem auto" }}
        />
      </div>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          zIndex: 9999
        }}>
          <span>Loading map data...</span>
        </div>
      )}
      <div ref={mapContainer} style={{ flexGrow: 1 }} />
    </div>
  );
}