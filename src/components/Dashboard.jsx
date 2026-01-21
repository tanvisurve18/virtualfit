import React, { useEffect, useState } from "react";
import {
  Box,
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

          {/* PRODUCTS GRID - FIXED WITH GRID2 */}       
          {!loading && products.length > 0 && (
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
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
                    }
                  }}
                >
                  {/* IMAGE WITH FIXED HEIGHT */}
                  <Box
                    sx={{
                      height: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#fff",
                      p: 2,
                      overflow: "hidden",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={product.image || "/placeholder.png"}
                      alt={product.title}
                      sx={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Box>

                  {/* CONTENT WITH FIXED HEIGHT */}
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Typography 
                      fontSize={14} 
                      fontWeight={700} 
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        minHeight: 40,
                        mb: 1,
                      }}
                    >
                      {product.title}
                    </Typography>

                    <Typography 
                      fontSize={16} 
                      fontWeight={700}
                      color="primary"
                    >
                      {product.price}
                    </Typography>
                  </CardContent>

                  {/* BUTTONS */}
                  <Box sx={{ p: 2, pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleTryOn(product)}
                      sx={{
                        bgcolor: "#6C5CE7",
                        fontWeight: 600,
                        "&:hover": {
                          bgcolor: "#5849c7",
                        }
                      }}
                    >
                      TRY ON
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => window.open(product.product_url, "_blank")}
                      sx={{
                        borderColor: "#6C5CE7",
                        color: "#6C5CE7",
                        fontWeight: 600,
                        "&:hover": {
                          borderColor: "#5849c7",
                          bgcolor: "rgba(108, 92, 231, 0.04)",
                        }
                      }}
                    >
                      BUY ON AMAZON
                    </Button>
                  </Box>
                </Card>
              ))}
            </Box>
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