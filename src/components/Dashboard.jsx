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

/* ---------------- THEME ---------------- */
const THEME = {
  primary: "#7B4BFF",
  gradient:
    "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
};
const COLLECTIONS = {
  women: "687879225714",
  men: "687879061874",
  hoodies: "687879258482",
  tshirts: "687879324018",
};


export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [activeCollection, setActiveCollection] = useState("women");

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    loadProducts(false);
  }, []);

  async function loadProducts(isLoadMore = false, collection = activeCollection) {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "shopify-products",
        {
          body: {
            cursor: isLoadMore ? cursor : null,
            collection,
          },
        }
      );

      if (error) throw error;

      const newProducts = data.products || [];

      setProducts((prev) =>
        isLoadMore ? [...prev, ...newProducts] : newProducts
      );

      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading products…</Typography>
      </Box>
    );
  }

  /* ---------------- ERROR ---------------- */
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  function handleCollectionChange(col) {
    setActiveCollection(col);
    setProducts([]);
    setCursor(null);
    setHasMore(true);
    loadProducts(false, col);
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
          <Typography>
            Welcome back — your wardrobe is ready.
          </Typography>
        </Box>

        {/* NEW ARRIVALS */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>
            New Arrivals ✨
          </Typography>
          {/* COLLECTION BUTTONS */}
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button
              variant={activeCollection === "women" ? "contained" : "outlined"}
              onClick={() => handleCollectionChange("women")}
            >
              WOMEN
            </Button>

            <Button
              variant={activeCollection === "men" ? "contained" : "outlined"}
              onClick={() => handleCollectionChange("men")}
            >
              MEN
            </Button>

            <Button
              variant={activeCollection === "hoodies" ? "contained" : "outlined"}
              onClick={() => handleCollectionChange("hoodies")}
            >
              HOODIES
            </Button>

            <Button
              variant={activeCollection === "tshirts" ? "contained" : "outlined"}
              onClick={() => handleCollectionChange("tshirts")}
            >
              T-SHIRTS
            </Button>
          </Box>

          {products.length === 0 ? (
            <Typography>No products found</Typography>
          ) : (
            <>
              <Grid container spacing={2}>
                {products && products.length > 0 && products.map((product) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                    <Card sx={{ borderRadius: 2 }}>
                      <CardMedia
                        component="img"
                        image={product.image}
                        alt={product.title}
                        sx={{
                          height: 140,
                          objectFit: "contain",
                          p: 1,
                          bgcolor: "#fff",
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

                        <Typography
                          fontSize={12}
                          color="text.secondary"
                        >
                          ₹{product.price}
                        </Typography>
                      </CardContent>

                      <Button
                        size="small"
                        fullWidth
                        sx={{
                          m: 1,
                          bgcolor: THEME.primary,
                          color: "#fff",
                          fontSize: 11,
                          "&:hover": { bgcolor: "#6C3EE3" },
                        }}
                      >
                        TRY ON
                      </Button>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* LOAD MORE */}
              {hasMore && (
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Button
                    variant="outlined"
                    disabled={loadingMore}
                    onClick={() => loadProducts(true)}
                  >
                    {loadingMore ? "Loading..." : "LOAD MORE"}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
