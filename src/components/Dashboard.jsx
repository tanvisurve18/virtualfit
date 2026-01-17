import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  CircularProgress,
} from "@mui/material";

import Sidebar from "./Sidebar";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

/* 🔗 AMAZON EDGE FUNCTION */
const AMAZON_PRODUCTS_API =
  "https://fqpweatumhbxnuvwpgrb.supabase.co/functions/v1/amazon-products";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  /* ---------------- FETCH USER NAME ---------------- */
  async function fetchUserName() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserName(
        user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "User"
      );
    } catch (err) {
      console.error("User fetch failed", err);
      setUserName("User");
    }
  }
  /* ---------------- FETCH AMAZON PRODUCTS ---------------- */
  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(AMAZON_PRODUCTS_API);
      const data = await res.json();

      setProducts(data || []);
    } catch (err) {
      console.error("Failed to load Amazon products:", err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
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
          <Typography>Try outfits virtually & shop from Amazon</Typography>
        </Box>

        {/* PRODUCTS */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>
            Amazon Products ✨
          </Typography>

          {/* LOADING */}
          {loading && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          )}

          {/* ERROR */}
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          {/* PRODUCTS GRID */}
          {!loading && products.length > 0 && (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardMedia
                      component="img"
                      image={product.image || "/placeholder.png"}
                      alt={product.title}
                      sx={{
                        height: 160,
                        objectFit: "contain",
                        bgcolor: "#fff",
                        p: 1,
                      }}
                    />

                    <CardContent>
                      <Typography fontSize={14} fontWeight={700} noWrap>
                        {product.title}
                      </Typography>

                      <Typography fontSize={13} color="text.secondary">
                        {product.price}
                      </Typography>
                    </CardContent>

                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 1 }}
                      onClick={() => handleTryOn(product)}
                    >
                      TRY ON
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{ mt: 1 }}
                      onClick={() =>
                        window.open(product.product_url, "_blank")
                      }
                    >
                      BUY ON AMAZON
                    </Button>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {!loading && products.length === 0 && !error && (
            <Typography sx={{ mt: 2 }}>
              No products found
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
