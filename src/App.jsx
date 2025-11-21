import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import VirtualTryOn from "./components/VirtualTryOn";
import ClothingSelector from "./components/ClothingSelector";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserDashboard from "./components/UserDashboard";
import SignupSuccess from "./components/SignupSuccess";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";

import "./App.css";

function App() {
  const [clothingItems, setClothingItems] = useState([]);
  const [selectedClothing, setSelectedClothing] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const womensClothingUrl =
          "https://fakestoreapi.com/products/category/women%27s%20clothing";
        const mensClothingUrl =
          "https://fakestoreapi.com/products/category/men%27s%20clothing";

        const [womensResponse, mensResponse] = await Promise.all([
          fetch(womensClothingUrl),
          fetch(mensClothingUrl),
        ]);

        const womensData = await womensResponse.json();
        const mensData = await mensResponse.json();

        setClothingItems([...womensData, ...mensData]);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };

    fetchProducts();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-success" element={<SignupSuccess />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

      </Routes>
    </Router>
  );
}

export default App;
