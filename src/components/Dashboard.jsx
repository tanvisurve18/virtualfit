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

/* ---------------- THEME ---------------- */
const THEME = {
  gradient:
    "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
};

/* ---------------- COLLECTION KEYS ---------------- */
const COLLECTIONS = ["women", "men", "hoodies", "tshirts"];

/* ================= DASHBOARD ================= */
export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [activeCollection, setActiveCollection] = useState("women");
  const [userName, setUserName] = useState("User");

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  /* ---------------- FETCH USER NAME ---------------- */
  async function fetchUserName() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get user metadata or profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || profile.name || user.email?.split("@")[0] || "User");
      } else {
        // Fallback to user metadata
        setUserName(
          user.user_metadata?.full_name || 
          user.user_metadata?.name || 
          user.email?.split("@")[0] || 
          "User"
        );
      }
    } catch (err) {
      console.error("Error fetching user name:", err);
    }
  }

  function handleTryOn(product) {
    console.log("Navigating to tryon with product:", product);

    navigate("/tryon", {
      state: {
        image: product.image,
        title: product.title,
        price: product.price,
        buyUrl: product.buyUrl,
      },
    });
  }

  /* ---------------- FETCH PRODUCTS ---------------- */
  async function loadProducts({ isLoadMore = false, collection }) {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      setError(null);

      console.log("CALLING WITH COLLECTION 👉", collection);

      const response = await supabase.functions.invoke("shopify-products", {
        body: {
          collection,
          cursor: isLoadMore ? cursor : null,
        },
      });

      console.log("FUNCTION RESPONSE 👉", response);

      if (response.error) throw response.error;

      const data = response.data;
      console.log("PRODUCTS RECEIVED 👉", data);

      setProducts((prev) =>
        isLoadMore ? [...prev, ...data.products] : data.products
      );

      setCursor(data.nextCursor);
    } catch (err) {
      console.error("Failed to load products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    fetchUserName();
    loadProducts({ collection: activeCollection });
  }, []);

  /* ---------------- TAB CHANGE ---------------- */
  function handleCollectionChange(col) {
    console.log("TAB CLICKED 👉", col);

    setActiveCollection(col);
    setProducts([]);
    setCursor(null);

    loadProducts({
      collection: col,
      isLoadMore: false,
    });
  }

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
          <Typography>Welcome back — your wardrobe is ready.</Typography>
        </Box>

        {/* NEW ARRIVALS */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>
            New Arrivals ✨
          </Typography>

          {/* COLLECTION TABS */}
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            {COLLECTIONS.map((col) => (
              <Button
                key={col}
                variant={activeCollection === col ? "contained" : "outlined"}
                onClick={() => handleCollectionChange(col)}
              >
                {col.toUpperCase()}
              </Button>
            ))}
          </Box>

          {/* LOADING */}
          {loading && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          )}

          {/* ERROR */}
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              Error: {error}
            </Typography>
          )}

          {/* NO PRODUCTS */}
          {!loading && products.length === 0 && !error && (
            <Typography sx={{ mt: 2 }}>
              No products found in this collection
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
                        ₹{product.price}
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
                      onClick={() => window.open(product.buyUrl, "_blank")}
                    >
                      BUY
                    </Button>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* LOAD MORE */}
          {cursor && !loadingMore && (
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Button
                variant="outlined"
                onClick={() =>
                  loadProducts({
                    collection: activeCollection,
                    isLoadMore: true,
                  })
                }
              >
                Load More
              </Button>
            </Box>
          )}

          {loadingMore && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}