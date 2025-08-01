import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App";
import NeighborhoodDataSheet from "./NeighborhoodDataSheet";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/neighborhood/:name" element={<NeighborhoodDataSheet />} />
      </Routes>
    </Router>
  </React.StrictMode>
);