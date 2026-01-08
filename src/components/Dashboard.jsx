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
  InputBase,
  Tabs,
  Tab,
  IconButton
} from "@mui/material";

import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ShareIcon from "@mui/icons-material/Share";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteIcon from "@mui/icons-material/Delete";

import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Sidebar from "./Sidebar";

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

/* ================= COMPONENT ================= */
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const storedUser = getStoredUser();

  /* -------- STATE -------- */
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const [savedOutfits, setSavedOutfits] = useState([]);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const [tryOnHistory, setTryOnHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTryOn, setSelectedTryOn] = useState(null);



    /* -------- Fetch TRYON HISTORY -------- */
  const fetchTryOnHistory = async () => {
    const { data, error } = await supabase
      .from("tryon_history")
      .select("id, image_url, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching try-on history:", error);
      return;
    }

    console.log("Try-on history:", data);
    setTryOnHistory(data);
  };

/* -------- FALLBACK IMAGES -------- */
  const FALLBACK_IMAGES = useMemo(
    () => [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246",
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
    ],
    []
  );

  /* -------- NEW ARRIVALS -------- */
  const newItems = [
    { id: "n1", title: "Black Crop Tee", price: "$29", image: FALLBACK_IMAGES[0] },
    { id: "n2", title: "Oversized Hoodie", price: "$49", image: FALLBACK_IMAGES[1] },
    { id: "n3", title: "High Waist Jeans", price: "$59", image: FALLBACK_IMAGES[2] },
    { id: "n4", title: "White Sneakers", price: "$69", image: FALLBACK_IMAGES[3] },
  ];

  /* -------- TAB SYNC WITH URL -------- */
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    
    const tabParam = searchParams.get("tab");
    if (tabParam === "saved") setTab(0);
    else if (tabParam === "history") setTab(1);
    else if (tabParam === "recs") setTab(2);
  }, [searchParams]);

  /* -------- FETCH DATA -------- */
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // MOCK DATA FOR NOW
      setSavedOutfits([
        { id: 1, name: "Summer Floral", image: FALLBACK_IMAGES[0], tags: ["summer"] },
        { id: 2, name: "Casual Street", image: FALLBACK_IMAGES[1], tags: ["street"] },
      ]);

      setHistory([
        { id: 1, outfit_name: "Denim Fit", image: FALLBACK_IMAGES[2], action: "Tried On" },
      ]);

      setRecommendations([
        { id: 1, title: "Floral Midi", image: FALLBACK_IMAGES[3], price: "$49" },
      ]);

      setRecentlyViewed(newItems);
      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    const fetchTryOnHistory = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No user logged in");
        return;
      }

      console.log("Logged in user:", user.id);

      const { data, error } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch history error:", error);
      } else {
        console.log("Try-on history:", data);
        setTryOnHistory(data);
      }
    };

    fetchTryOnHistory();
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      console.log("AUTH USER:", data?.user);
    };

    checkUser();
  }, []);

  /* -------- ACTIONS -------- */
  const openOutfit = (o) => {
    setSelectedOutfit(o);
    setModalOpen(true);
  };

  const handleTryOn = (item) => {
    navigate(`/tryon?item=${item.id}`);
  };
  const handleDone = () => {
    stopCamera();
    navigate('/dashboard?tab=history');
  };

  const deleteTryOn = async (id, imageUrl) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User not logged in");
        return;
      }

      // 1️⃣ Delete from DB
      const { error: dbError } = await supabase
        .from("tryon_history")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      // 2️⃣ Delete from Storage
      const filePath = imageUrl.split("/storage/v1/object/public/")[1];

      await supabase.storage
        .from("tryon-images")
        .remove([filePath]);

      // 3️⃣ Update UI
      setTryOnHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete failed:", err.message);
    }
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
            <IconButton onClick={() => setFilterOpen(true)}>
              <TuneIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* NEW ARRIVALS */}
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>
            New Arrivals ✨
          </Typography>

          <Grid container spacing={2}>
            {newItems.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.id}>
                <Card>
                  <CardMedia component="img" height="220" image={item.image} />
                  <CardContent>
                    <Typography fontWeight={700}>{item.title}</Typography>
                    <Typography>{item.price}</Typography>
                  </CardContent>
                  <CardActions>
                    <Button onClick={() => openOutfit(item)}>View</Button>
                    <Button
                      variant="contained"
                      sx={{ bgcolor: THEME.primary }}
                      onClick={() => handleTryOn(item)}
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
        <Paper sx={{ mt: 5 }}>
          <Tabs
            value={activeTab}
            onChange={(e, value) => setActiveTab(value)}
            sx={{ mt: 4 }}
          >
            <Tab label="Saved Looks" />
            <Tab label="Try-On History" />
            <Tab label="Recommendations" />
          </Tabs>
        </Paper>

        {/* TAB CONTENT */}
        {activeTab === 1 && (
          <Box sx={{ mt: 3 }}>
            {loadingHistory ? (
              <CircularProgress />
            ) : tryOnHistory.length === 0 ? (
              <Typography>No try-on history yet</Typography>
            ) : (
              <Grid container spacing={2}>
                {tryOnHistory.map((item) => (
                  <Grid item xs={12} md={6} lg={4} key={item.id}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        boxShadow: "0px 6px 18px rgba(0,0,0,0.06)"
                      }}
                    >
                      {/* Image */}
                      <Box
                        component="img"
                        src={item.image_url}
                        alt="try-on"
                        sx={{
                          width: 100,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 2,
                          backgroundColor: "#f5f5f5"
                        }}
                      />

                      {/* Info */}
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          Try-On Look
                        </Typography>

                        <Typography sx={{ fontSize: 12, color: "#666" }}>
                          {new Date(item.created_at).toLocaleString()}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/tryon?retake=${item.id}`)}
                          >
                            Retake
                          </Button>

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
                      </Box>
                    </Paper>
                  </Grid>


                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>


      {/* MODAL */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedOutfit?.title || selectedOutfit?.name}</DialogTitle>
        <DialogContent>
          <img
            src={selectedOutfit?.image}
            style={{ width: "100%", borderRadius: 8 }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 1 }}>
          <img
            src={previewImage}
            alt="Preview"
            style={{
              width: "100%",
              borderRadius: "8px"
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
  <DialogTitle>Delete Try-On</DialogTitle>

  <DialogContent>
    <Typography>
      Are you sure you want to delete this try-on image?
    </Typography>
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setDeleteOpen(false)}>
      Cancel
    </Button>

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
