import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  InputBase,
  Tabs,
  Tab,
  IconButton,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";

import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "./Sidebar";
import { fetchShopifyProducts } from "../api/shopify";

/* ---------------- THEME ---------------- */
const THEME = {
  primary: "#7B4BFF",
  primaryDark: "#6C3EE3",
  gradient:
    "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
};

/* ---------------- HELPERS ---------------- */
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("vf_user") || "null");
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedUser = getStoredUser();

  /* ---------------- STATE ---------------- */
  const [activeTab, setActiveTab] = useState(0);
  const [searchQ, setSearchQ] = useState("");

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [tryOnHistory, setTryOnHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTryOn, setSelectedTryOn] = useState(null);
  
  const [newItems, setNewItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  /* ---------------- TAB SYNC ---------------- */
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "history") setActiveTab(1);
    else if (tabParam === "recs") setActiveTab(2);
    else setActiveTab(0);
  }, [searchParams]);

  /* ---------------- FETCH SHOPIFY PRODUCTS ---------------- */
  useEffect(() => {
    fetchShopifyProducts()
      .then((data) => {
        setProducts(data);
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, []);

  /* ---------------- FETCH TRY-ON HISTORY ---------------- */
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) setTryOnHistory(data);
      setLoadingHistory(false);
    };

    fetchHistory();
  }, []);

  
  /* ---------------- LOAD SHOPIFY ---------------- */

  useEffect(() => {
    async function loadShopify() {
      try {
        const products = await fetchShopifyProducts();

        // Map Shopify → your UI format
        const mapped = products.map((p) => ({
          id: p.id,
          title: p.title,
          image: p.images?.[0]?.src,
          price: `₹${p.variants?.[0]?.price}`,
        }));

        setNewItems(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingItems(false);
      }
    }

    loadShopify();
  }, []);


  /* ---------------- ACTIONS ---------------- */
  const handleTryOn = (product) => {
    navigate(`/tryon?item=${product.id}`);
  };

  const deleteTryOn = async (id, imageUrl) => {
    await supabase.from("tryon_history").delete().eq("id", id);

    const filePath = imageUrl.split("/storage/v1/object/public/")[1];
    await supabase.storage.from("tryon-images").remove([filePath]);

    setTryOnHistory((prev) => prev.filter((i) => i.id !== id));
  };

  /* ================= RENDER ================= */
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg }}>
      <Sidebar storedUser={storedUser} />

      <Box sx={{ ml: { xs: "70px", md: "240px" }, p: 3 }}>
        {/* HEADER */}
        <Box sx={{ p: 3, borderRadius: 3, background: THEME.gradient }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            Hi {storedUser?.name?.split(" ")[0] || "there"} 👋
          </Typography>
          <Typography>Welcome back — your wardrobe is ready.</Typography>
        </Box>

        {/* SEARCH */}
        <Paper sx={{ mt: 3, p: 2 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <SearchIcon />
            <InputBase
              placeholder="Search outfits..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              sx={{ flex: 1 }}
            />
            <IconButton>
              <TuneIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* NEW ARRIVALS (SHOPIFY) */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>
            New Arrivals ✨
          </Typography>

          {loadingProducts ? (
            <CircularProgress />
          ) : (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid item xs={12} sm={6} md={3} key={product.id}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="220"
                      image={product.images?.[0]?.src}
                    />
                    <CardContent>
                      <Typography fontWeight={700}>
                        {product.title}
                      </Typography>
                      <Typography>
                        ₹{product.variants?.[0]?.price}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button onClick={() => setSelectedOutfit(product)}>
                        View
                      </Button>
                      <Button
                        variant="contained"
                        sx={{ bgcolor: THEME.primary }}
                        onClick={() => handleTryOn(product)}
                      >
                        Try On
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* TABS */}
        <Paper sx={{ mt: 5 }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
          >
            <Tab label="Saved Looks" />
            <Tab label="Try-On History" />
            <Tab label="Recommendations" />
          </Tabs>
        </Paper>

        {/* TRY-ON HISTORY */}
        {activeTab === 1 && (
          <Box sx={{ mt: 3 }}>
            {loadingHistory ? (
              <CircularProgress />
            ) : (
              <Grid container spacing={2}>
                {tryOnHistory.map((item) => (
                  <Grid item xs={12} md={6} lg={4} key={item.id}>
                    <Paper sx={{ p: 2, borderRadius: 3 }}>
                      <Box
                        component="img"
                        src={item.image_url}
                        sx={{
                          width: "100%",
                          height: 200,
                          objectFit: "cover",
                          borderRadius: 2,
                        }}
                      />
                      <Typography sx={{ mt: 1, fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleString()}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedTryOn(item);
                            setDeleteOpen(true);
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>

      {/* DELETE DIALOG */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Try-On</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              await deleteTryOn(
                selectedTryOn.id,
                selectedTryOn.image_url
              );
              setDeleteOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
