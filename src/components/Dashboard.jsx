// src/components/Dashboard.jsx

import React, { useEffect, useState, useMemo } from "react";
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
  Chip,
  Tooltip,
  Stack,
  CircularProgress,
  useMediaQuery,
  InputBase,
  Tabs,
  Tab,
  IconButton
} from "@mui/material";

import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ShareIcon from "@mui/icons-material/Share";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";

import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// 👉 Import your new Sidebar
import Sidebar from "./Sidebar";

const [filterOpen, setFilterOpen] = useState(false);

const [brandFilters, setBrandFilters] = useState([]);
const [sizeFilter, setSizeFilter] = useState("");
const [colorFilter, setColorFilter] = useState("");
const [priceRange, setPriceRange] = useState([20, 120]);


// THEME
const THEME = {
  primary: "#7B4BFF",
  primaryDark: "#6C3EE3",
  gradient: "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("vf_user") || "null");
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const isSm = useMediaQuery("(max-width:900px)");

  // 🔥 Sidebar no longer controlled here
  // Sidebar handles collapse internally

  // Dashboard states
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const FALLBACK_IMAGES = useMemo(
    () => [
      "https://i.ibb.co/8cF4XjT/outfit1.jpg",
      "https://i.ibb.co/xh0Y3n2/outfit2.jpg",
      "https://i.ibb.co/0y9q8kq/outfit3.jpg",
      "https://i.ibb.co/4d6t8T8/outfit4.jpg",
      "https://i.ibb.co/3sZ7m6m/outfit5.jpg",
    ],
    []
  );

  // -------- FETCH DATA ---------
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);

      // If user not logged in → fallback
      if (!storedUser) {
        if (mounted) {
          setSavedOutfits(mockSaved());
          setHistory(mockHistory());
          setRecommendations(mockRecs());
          setRecentlyViewed(mockRecentlyViewed());
          setLoading(false);
        }
        return;
      }

      try {
        const queryBy = storedUser.id
          ? { key: "user_id", value: storedUser.id }
          : { key: "user_email", value: storedUser.email };

        // saved_outfits
        const savedQ = supabase
          .from("saved_outfits")
          .select("*")
          .order("created_at", { ascending: false });

        savedQ.eq(queryBy.key, queryBy.value);
        const { data: savedData } = await savedQ;

        // history
        const histQ = supabase
          .from("tryon_history")
          .select("*")
          .order("created_at", { ascending: false });

        histQ.eq(queryBy.key, queryBy.value);
        const { data: historyData } = await histQ;

        // recommendations
        const { data: recsData } = await supabase
          .from("recommendations")
          .select("*");

        // recently viewed
        let rv = [];
        try {
          const { data } = await supabase
            .from("recently_viewed")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(8);

          rv = data || [];
        } catch {}

        if (!mounted) return;

        setSavedOutfits(savedData?.length ? savedData : mockSaved());
        setHistory(historyData?.length ? historyData : mockHistory());
        setRecommendations(recsData?.length ? recsData : mockRecs());
        setRecentlyViewed(rv.length ? rv : mockRecentlyViewed());
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
    }

    loadAll();
    return () => (mounted = false);
  }, []);

  // -------- MOCK DATA ---------
  const newItems = [
    { id: "n1", title: "Black Crop Tee", price: "$29", image: FALLBACK_IMAGES[0] },
    { id: "n2", title: "Oversized Hoodie", price: "$49", image: FALLBACK_IMAGES[1] },
    { id: "n3", title: "High Waist Jeans", price: "$59", image: FALLBACK_IMAGES[2] },
    { id: "n4", title: "White Minimal Sneakers", price: "$69", image: FALLBACK_IMAGES[3] },
  ];

  function mockSaved() {
    return Array.from({ length: 6 }).map((_, i) => ({
      id: `saved-${i}`,
      name: ["Summer Floral", "Office Chic", "Casual Street"][i % 3],
      image: FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
      notes: "Saved look",
      tags: ["summer", "popular"],
    }));
  }

  function mockHistory() {
    return Array.from({ length: 4 }).map((_, i) => ({
      id: `hist-${i}`,
      outfit_name: ["Sun Dress", "Denim Fit", "Party Set"][i % 3],
      image: FALLBACK_IMAGES[(i + 1) % FALLBACK_IMAGES.length],
      action: "Tried On",
      created_at: new Date(Date.now() - i * 2000000),
    }));
  }

  function mockRecs() {
    return Array.from({ length: 6 }).map((_, i) => ({
      id: `rec-${i}`,
      title: ["Floral Midi", "Blazer", "Silk Top"][i % 3],
      image: FALLBACK_IMAGES[(i + 2) % FALLBACK_IMAGES.length],
      price: "$49",
    }));
  }

  function mockRecentlyViewed() {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: `rv-${i}`,
      title: ["Denim Jacket", "Cropped Tee", "Sneakers"][i % 3],
      image: FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
    }));
  }

  // -----------------------------------

  const openOutfit = (o) => {
    setSelectedOutfit(o);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleDownload = (outfit) => {
    const link = document.createElement("a");
    link.href = outfit.image;
    link.download = "outfit.jpg";
    link.click();
  };

  const handleShare = async (outfit) => {
    if (navigator.share) {
      navigator.share({ title: "VirtualFit Look", url: outfit.image });
    } else {
      navigator.clipboard.writeText(outfit.image);
      alert("Copied URL!");
    }
  };

  // -----------------------------------

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg }}>

      {/* ⭐ NEW SIDEBAR */}
      <Sidebar storedUser={storedUser} />

      {/* ⭐ MAIN CONTENT */}
      <Box
        sx={{
          ml: { xs: "70px", md: "240px" },
          transition: "0.3s",
          p: 3,
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            background: THEME.gradient,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
              Hi {storedUser?.name?.split(" ")[0] || "there"} 👋
            </Typography>
            <Typography>Welcome back — your wardrobe is ready.</Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={() => navigate("/tryon")}>
              Quick Try-On
            </Button>
            <Button variant="contained" sx={{ background: THEME.primary }}>
              New Try-On
            </Button>
          </Box>
        </Box>

        {/* SEARCH */}
        <Paper sx={{ mt: 4, p: 2, borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <SearchIcon />
            <InputBase
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search outfits..."
              sx={{ flex: 1 }}
            />
            <Tooltip title="Filters">
              <IconButton onClick={() => setFilterOpen(true)}>
                <TuneIcon />
              </IconButton>
            </Tooltip>

          </Box>
        </Paper>

        {/* RECENTLY VIEWED */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>
            Recently viewed
          </Typography>

          <Box sx={{ display: "flex", overflowX: "auto", gap: 2 }}>
            {recentlyViewed.map((rv) => (
              <Paper key={rv.id} sx={{ p: 1.5, minWidth: 180, borderRadius: 2 }}>
                <img
                  src={rv.image}
                  alt={rv.title}
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 8,
                    objectFit: "cover",
                  }}
                />
                <Typography sx={{ mt: 1, fontWeight: 700 }}>
                  {rv.title}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
        {/* ========================= NEW ITEMS SECTION ========================= */}
        <Box sx={{ mt: 5 }}>
          <Typography sx={{ fontWeight: 800, mb: 2, color: "#2B2345", fontSize: 22 }}>
            New Arrivals ✨
          </Typography>

          <Grid container spacing={2}>
            {newItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow: "0px 8px 22px rgba(43,35,69,0.06)",
                    cursor: "pointer",
                    transition: "0.25s",
                    ":hover": { transform: "translateY(-6px)" },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="260"
                    image={item.image}
                    alt={item.title}
                    sx={{ objectFit: "cover" }}
                  />

                  <CardContent>
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ color: "#666" }}>{item.price}</Typography>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between" }}>
                    <Button size="small" sx={{ textTransform: "none" }}>
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ background: THEME.primary }}
                    >
                      Try On
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* TABS */}
        <Paper sx={{ mt: 5, mb: 3 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)}>
            <Tab label={`Saved Looks (${savedOutfits.length})`} />
            <Tab label={`Try-On History (${history.length})`} />
            <Tab label="Recommendations" />
          </Tabs>
        </Paper>

        {/* TAB CONTENT */}
        {loading ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : tab === 0 ? (
          /* SAVED LOOKS */
          <Grid container spacing={2}>
            {savedOutfits.map((o) => (
              <Grid item xs={12} sm={6} md={4} key={o.id}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardMedia component="img" height="260" image={o.image} />
                  <CardContent>
                    <Typography sx={{ fontWeight: 800 }}>{o.name}</Typography>
                    <Typography sx={{ fontSize: 12 }}>{o.notes}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {(o.tags || []).map((t, i) => (
                        <Chip label={t} key={i} size="small" />
                      ))}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "space-between" }}>
                    <Button size="small" onClick={() => openOutfit(o)}>
                      View
                    </Button>

                    <Box>
                      <IconButton onClick={() => handleDownload(o)}>
                        <FileDownloadIcon />
                      </IconButton>
                      <IconButton onClick={() => handleShare(o)}>
                        <ShareIcon />
                      </IconButton>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : tab === 1 ? (
          /* HISTORY */
          <Grid container spacing={2}>
            {history.map((h) => (
              <Grid item xs={12} md={6} key={h.id}>
                <Paper sx={{ p: 2, display: "flex", gap: 2, borderRadius: 2 }}>
                  <img
                    src={h.image}
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>
                      {h.outfit_name}
                    </Typography>
                    <Typography sx={{ color: "#666" }}>{h.action}</Typography>
                    <Button size="small" onClick={() => openOutfit(h)}>
                      View
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          /* RECOMMENDATIONS */
          <Grid container spacing={2}>
            {recommendations.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.id}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardMedia component="img" height="260" image={r.image} />
                  <CardContent>
                    <Typography sx={{ fontWeight: 800 }}>{r.title}</Typography>
                    <Typography sx={{ color: "#666" }}>{r.price}</Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => openOutfit(r)}>
                      View
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

      </Box>

      {/* OUTFIT MODAL */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="md" fullWidth>
        <DialogTitle>{selectedOutfit?.name}</DialogTitle>
        <DialogContent>
          <img
            src={selectedOutfit?.image}
            style={{ width: "100%", borderRadius: 8 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* ========================= FILTERS PANEL ========================= */}
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Filters</DialogTitle>

        <DialogContent dividers>

          {/* Brand Filter */}
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Brand</Typography>
          {["Zara", "H&M", "Uniqlo", "Urbanic"].map((b) => (
            <Box key={b} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <input
                type="checkbox"
                checked={brandFilters.includes(b)}
                onChange={() =>
                  setBrandFilters((prev) =>
                    prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
                  )
                }
              />
              <Typography sx={{ ml: 1 }}>{b}</Typography>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />

          {/* Size Filter */}
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Size</Typography>
          <Stack direction="row" spacing={1}>
            {["XS", "S", "M", "L", "XL"].map((s) => (
              <Button
                key={s}
                variant={sizeFilter === s ? "contained" : "outlined"}
                onClick={() => setSizeFilter(s)}
                sx={{ minWidth: 50 }}
              >
                {s}
              </Button>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Color Filter */}
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Color</Typography>
          <Stack direction="row" spacing={1}>
            {["#000", "#fff", "#c19a6b", "#e63946", "#457b9d"].map((c) => (
              <Box
                key={c}
                onClick={() => setColorFilter(c)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: c,
                  border: colorFilter === c ? "2px solid #7B4BFF" : "2px solid #ddd",
                  cursor: "pointer",
                }}
              />
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Price Filter */}
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Price Range</Typography>
          <Typography>${priceRange[0]} – ${priceRange[1]}</Typography>

          <input
            type="range"
            min={0}
            max={200}
            value={priceRange[0]}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            style={{ width: "100%", marginTop: "10px" }}
          />

          <input
            type="range"
            min={0}
            max={200}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            style={{ width: "100%", marginTop: "5px" }}
          />

        </DialogContent>

        <DialogActions>
          <Button onClick={() => setFilterOpen(false)}>Close</Button>
          <Button variant="contained" sx={{ background: THEME.primary }}>Apply</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
