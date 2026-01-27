import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
} from "@mui/material";

import Sidebar from "./Sidebar";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { hmMenTshirts } from "../data/hmMenTshirts";

/* ---------------- THEME ---------------- */
const THEME = {
  gradient:
    "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
};

/* ================= DASHBOARD ================= */
export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [userName, setUserName] = useState("User");

  const navigate = useNavigate();

  /* ---------------- FETCH USER NAME ---------------- */
  async function fetchUserName() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name);
      } else {
        setUserName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User"
        );
      }
    } catch (err) {
      console.error("User fetch failed", err);
    }
  }

  /* ---------------- LOAD H&M PRODUCTS ---------------- */
  function loadProducts() {
    // Normalize H&M data to match your app
    const normalized = hmMenTshirts.map((item, index) => ({
      id: index,
      title: item.title,
      price: item.price,
      image: item.image,
      product_url: item.url,
    }));

    setProducts(normalized);
  }

  /* ---------------- TRY ON ---------------- */
  function handleTryOn(product) {
    navigate("/tryon", {
      state: {
        image: product.image,
        title: product.title,
        price: product.price,
        buyUrl: product.product_url,
      },
    });
  }

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    fetchUserName();
    loadProducts();
  }, []);

  /* ================= UI ================= */
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg }}>
      <Sidebar userName={userName} />

      <Box sx={{ ml: { xs: "70px", md: "240px" }, p: 3 }}>
        {/* HEADER */}
        <Box sx={{ p: 3, borderRadius: 3, background: THEME.gradient }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            Hi {userName} 👋
          </Typography>
          <Typography>Try H&M outfits virtually</Typography>
        </Box>

        {/* PRODUCTS */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>
            H&M Men T-Shirts 👕
          </Typography>

          {/* PRODUCTS GRID */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 3,
            }}
          >
            {products.map((product) => (
              <Card
                key={product.id}
                sx={{
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  },
                }}
              >
                {/* IMAGE */}
                <Box
                  sx={{
                    height: 250,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#f5f5f5",
                    p: 2,
                  }}
                >
                  <CardMedia
                    component="img"
                    image={product.image}
                    alt={product.title}
                    onError={(e) => {
                      console.error("Image failed to load:", product.image);
                      e.target.src = "https://via.placeholder.com/400x400/f0f0f0/666666?text=H%26M+T-Shirt";
                    }}
                    sx={{
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                </Box>

                {/* CONTENT */}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography
                    fontSize={14}
                    fontWeight={700}
                    sx={{
                      mb: 1,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {product.title}
                  </Typography>

                  <Typography fontSize={18} fontWeight={700} color="primary">
                    {product.price}
                  </Typography>
                </CardContent>

                {/* ACTIONS */}
                <Box sx={{ p: 2, pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleTryOn(product)}
                    sx={{ fontWeight: 600 }}
                  >
                    TRY ON
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => window.open(product.product_url, "_blank")}
                    sx={{ fontWeight: 600 }}
                  >
                    BUY ON H&M
                  </Button>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
