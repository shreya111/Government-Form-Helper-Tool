import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import FormSimulator from "@/pages/FormSimulator";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<FormSimulator />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
