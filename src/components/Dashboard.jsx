import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  CircularProgress
} from "@mui/material";

import Sidebar from "./Sidebar";
import { supabase } from "../lib/supabaseClient";

/* ---------------- THEME ---------------- */
const THEME = {
  primary: "#7B4BFF",
  gradient:
    "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
};

/* ================= COMPONENT ================= */
export default function Dashboard() {
  /* ---------------- STATE (ALL HOOKS AT TOP) ---------------- */
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);

  /* ---------------- FETCH SHOPIFY PRODUCTS ---------------- */
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoadingProducts(true);

      const { data, error } = await supabase.functions.invoke(
        "shopify-products"
      );

      if (error) throw error;

      // Shopify REST response → products array
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setError("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  /* ---------------- RENDER STATES ---------------- */
  if (loadingProducts) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading products…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  /* ================= UI ================= */
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg }}>
      <Sidebar />

      <Box sx={{ ml: { xs: "70px", md: "240px" }, p: 3 }}>
        {/* HEADER */}
        <Box sx={{ p: 3, borderRadius: 3, background: THEME.gradient }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            Hi there 👋
          </Typography>
          <Typography>Welcome back — your wardrobe is ready.</Typography>
        </Box>

        {/* NEW ARRIVALS */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>
            New Arrivals ✨
          </Typography>

          <Grid container spacing={2}>
            {products.map((product) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                <Card sx={{ borderRadius: 2 }}>
                  {/* 🔽 SMALLER IMAGE SIZE */}
                  <CardMedia
                    component="img"
                    image={product.image?.src}
                    alt={product.title}
                    sx={{
                      height: 140,          // 👈 smaller image
                      objectFit: "contain",
                      p: 1,
                      backgroundColor: "#fff"
                    }}
                  />

                  <CardContent sx={{ p: 1 }}>
                    <Typography
                      fontSize={13}
                      fontWeight={700}
                      noWrap
                    >
                      {product.title}
                    </Typography>

                    <Typography fontSize={12} color="text.secondary">
                      ₹{product.variants?.[0]?.price}
                    </Typography>
                  </CardContent>

                  <Button
                    size="small"
                    sx={{
                      m: 1,
                      bgcolor: THEME.primary,
                      color: "#fff",
                      fontSize: 11,
                      "&:hover": { bgcolor: "#6C3EE3" }
                    }}
                    fullWidth
                  >
                    Try On
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
