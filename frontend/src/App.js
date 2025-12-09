import { useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import FormSimulator from "@/pages/FormSimulator";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FormSimulator />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
