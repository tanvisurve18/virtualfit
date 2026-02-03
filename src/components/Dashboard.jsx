import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Alert
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DownloadIcon from "@mui/icons-material/Download";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import Sidebar from "./Sidebar";
import RecommendationWidget from "../components/RecommendationWidget";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { hmMenTshirts } from "../data/hmMenTshirts";
import { hmWomenTshirts } from "../data/hmWomenTshirts";
import { Link } from 'react-router-dom';

/* ---------------- THEME ---------------- */
const THEME = {
  gradient:
    "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
  primary: "#6C5CE7"
};

/* ================= DASHBOARD ================= */
export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [userName, setUserName] = useState("User");
  const [activeView, setActiveView] = useState("overview");
  const [productCategory, setProductCategory] = useState(0); // 0 = Men, 1 = Women
  const [history, setHistory] = useState([]);
  const [savedLooks, setSavedLooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [savedProducts, setSavedProducts] = useState(new Set()); // track which product ids are already in closet
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

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
    // Load based on selected category
    const sourceData = productCategory === 0 ? hmMenTshirts : hmWomenTshirts;
    const normalized = sourceData.map((item, index) => ({
      id: item.id || index,
      title: item.title,
      price: item.price,
      image: item.image,
      product_url: item.url,
    }));

    setProducts(normalized);
  }

  /* ---------------- FETCH HISTORY ---------------- */
  async function fetchHistory() {
    setLoading(true);
    console.log("🔍 Fetching history...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("❌ No user found");
        setLoading(false);
        return;
      }

      console.log("👤 User ID:", user.id);

      const { data, error } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ History fetch error:", error);
        throw error;
      }

      console.log("✅ History data:", data);
      console.log("📊 Total records:", data?.length || 0);
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
      console.log("🏁 History fetch complete, loading set to false");
    }
  }

  /* ---------------- FETCH SAVED LOOKS ---------------- */
  async function fetchSavedLooks() {
    setLoading(true);
    console.log("💖 Fetching saved looks...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("❌ No user found");
        setLoading(false);
        return;
      }

      console.log("👤 User ID:", user.id);

      const { data, error } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_saved", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Saved looks fetch error:", error);
        throw error;
      }

      console.log("✅ Saved looks data:", data);
      console.log("📊 Saved records:", data?.length || 0);
      
      // Debug: Check is_saved values
      if (data && data.length > 0) {
        data.forEach((item, index) => {
          console.log(`Record ${index + 1}:`, {
            id: item.id,
            is_saved: item.is_saved,
            product_name: item.product_name
          });
        });
      }

      setSavedLooks(data || []);
    } catch (err) {
      console.error("Failed to fetch saved looks:", err);
    } finally {
      setLoading(false);
      console.log("🏁 Saved looks fetch complete, loading set to false");
    }
  }

  /* ---------------- DELETE FROM HISTORY ---------------- */
  async function handleDeleteHistory(id) {
    if (!window.confirm("Delete this try-on from history?")) return;

    setDeleting(id);
    try {
      const { error } = await supabase
        .from("tryon_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setHistory(history.filter(item => item.id !== id));
      if (activeView === "saved") {
        setSavedLooks(savedLooks.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  /* ---------------- UNSAVE LOOK ---------------- */
  async function handleUnsaveLook(id) {
    if (!window.confirm("Remove this from saved looks?")) return;

    setDeleting(id);
    try {
      const { error } = await supabase
        .from("tryon_history")
        .update({ is_saved: false })
        .eq("id", id);

      if (error) throw error;

      setSavedLooks(savedLooks.filter(item => item.id !== id));
      setHistory(history.map(item => 
        item.id === id ? { ...item, is_saved: false } : item
      ));
    } catch (err) {
      console.error("Unsave failed:", err);
      alert("Failed to unsave");
    } finally {
      setDeleting(null);
    }
  }

  /* ---------------- DOWNLOAD IMAGE ---------------- */
  async function handleDownload(imageData, productName) {
    try {
      const link = document.createElement("a");
      link.href = imageData;
      link.download = `tryon_${productName.replace(/\s+/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download image");
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

  /* ---------------- VIEW CHANGE HANDLER ---------------- */
  function handleViewChange(view) {
    console.log("🔄 Switching to view:", view);
    setActiveView(view);
    
    if (view === "history") {
      fetchHistory();
    } else if (view === "saved") {
      fetchSavedLooks();
    }
  }

  /* ─── fetch which products are already in closet (for ❤️ state) ─── */
  async function fetchSavedProductIds() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("closet_items")
        .select("product_id")
        .eq("user_id", user.id);
      if (data) setSavedProducts(new Set(data.map(r => String(r.product_id))));
    } catch (err) { console.error("fetchSavedProductIds:", err); }
  }

  /* ─── save product to closet (without try-on) ─── */
  async function saveToCloset(product) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const productId = String(product.id);

      // already saved? → unsave (toggle)
      if (savedProducts.has(productId)) {
        await supabase.from("closet_items").delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        setSavedProducts(prev => { const n = new Set(prev); n.delete(productId); return n; });
        setSnackbar({ open: true, message: "Removed from closet", severity: "info" });
        return;
      }

      // insert
      await supabase.from("closet_items").insert({
        user_id:        user.id,
        product_id:     productId,
        product_name:   product.title,
        product_image:  product.image,
        product_price:  product.price,
        product_url:    product.product_url,
        category:       productCategory === 0 ? "men" : "women",
        status:         "favorite"
      });
      setSavedProducts(prev => new Set([...prev, productId]));
      setSnackbar({ open: true, message: "❤️ Added to My Closet!", severity: "success" });
    } catch (err) {
      console.error("saveToCloset:", err);
      setSnackbar({ open: true, message: "Failed to save", severity: "error" });
    }
  }

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    fetchUserName();
    loadProducts();
    fetchSavedProductIds();
  }, []);

  /* ---------------- LOAD PRODUCTS WHEN CATEGORY CHANGES ---------------- */
  useEffect(() => {
    loadProducts();
  }, [productCategory]);

  /* ---------------- FETCH DATA WHEN VIEW CHANGES ---------------- */
  useEffect(() => {
    if (activeView === "history") {
      fetchHistory();
    } else if (activeView === "saved") {
      fetchSavedLooks();
    }
  }, [activeView]);

  /* ================= UI ================= */
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg }}>
      <Sidebar userName={userName} activeView={activeView} onViewChange={handleViewChange} />

      <Box sx={{ ml: { xs: "70px", md: "240px" }, p: 3 }}>
        {/* HEADER */}
        <Box sx={{ p: 3, borderRadius: 3, background: THEME.gradient, mb: 3 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            Hi {userName} 👋
          </Typography>
          <Typography>
            {activeView === "overview" && "Try H&M outfits virtually"}
            {activeView === "history" && "View all your captured try-ons"}
            {activeView === "saved" && "Your favorite looks collection"}
          </Typography>
        </Box>

        {/* OVERVIEW / PRODUCTS */}
        {activeView === "overview" && (
          <Box>
            {/* PRODUCT CATEGORY TABS */}
            <Box sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
              <Tabs 
                value={productCategory} 
                onChange={(e, newValue) => setProductCategory(newValue)}
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: 700,
                    fontSize: "1rem",
                    textTransform: "none",
                  },
                  "& .Mui-selected": {
                    color: THEME.primary,
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: THEME.primary,
                  },
                }}
              >
                <Tab label="👔 Men's Collection" />
                <Tab label="👗 Women's Collection" />
              </Tabs>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 3 }}>
              {productCategory === 0 ? "H&M Men T-Shirts 👕" : "H&M Women T-Shirts & Tops 👚"}
            </Typography>

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
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  {/* Heart Icon Button - Top Right */}
                  <IconButton
                    onClick={() => saveToCloset(product)}
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 1,
                      bgcolor: "rgba(255, 255, 255, 0.95)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      "&:hover": {
                        bgcolor: "white",
                        transform: "scale(1.1)"
                      },
                      transition: "all 0.2s"
                    }}
                  >
                    {savedProducts.has(String(product.id)) ? (
                      <FavoriteIcon sx={{ color: "#e91e63", fontSize: 24 }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ color: "#e91e63", fontSize: 24 }} />
                    )}
                  </IconButton>

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
                        e.target.src = "https://via.placeholder.com/400x400/f0f0f0/666666?text=H%26M+T-Shirt";
                      }}
                      sx={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Box>

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

                  <Box sx={{ p: 2, pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleTryOn(product)}
                      sx={{ fontWeight: 600, bgcolor: THEME.primary }}
                    >
                      TRY ON
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => window.open(product.product_url, "_blank")}
                      sx={{ fontWeight: 600, borderColor: THEME.primary, color: THEME.primary }}
                    >
                      BUY ON H&M
                    </Button>
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* TRY-ON HISTORY */}
        {activeView === "history" && (
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
              📸 Try-On History ({history.length})
            </Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: THEME.primary }} />
              </Box>
            ) : history.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Try-On History Yet
                </Typography>
                <Typography color="text.secondary">
                  Captured images will appear here automatically
                </Typography>
              </Box>
            ) : (
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
                {history.map((item) => (
                  <Card
                    key={item.id}
                    sx={{
                      borderRadius: 2,
                      position: "relative",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      },
                    }}
                  >
                    {item.is_saved && (
                      <Chip
                        icon={<FavoriteIcon sx={{ fontSize: 16 }} />}
                        label="Saved"
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          bgcolor: "rgba(255,255,255,0.95)",
                          color: "#e91e63",
                          fontWeight: 700,
                          zIndex: 1
                        }}
                      />
                    )}

                    <Box
                      sx={{
                        height: 300,
                        position: "relative",
                        cursor: "pointer",
                        bgcolor: "#f5f5f5"
                      }}
                      onClick={() => setSelectedImage(item)}
                    >
                      <CardMedia
                        component="img"
                        image={item.image_data}
                        alt="Try-on"
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                      
                      <IconButton
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "rgba(255,255,255,0.9)",
                          "&:hover": { bgcolor: "rgba(255,255,255,1)" }
                        }}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(item.id);
                        }}
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>

                    <CardContent>
                      <Typography fontSize={14} fontWeight={700} noWrap>
                        {item.product_name || "Unknown Product"}
                      </Typography>
                      <Typography fontSize={16} fontWeight={700} color="primary" sx={{ mb: 1 }}>
                        {item.product_price || "N/A"}
                      </Typography>
                      <Typography fontSize={12} color="text.secondary">
                        {new Date(item.created_at).toLocaleDateString()} at{" "}
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload(item.image_data, item.product_name)}
                        sx={{ borderColor: THEME.primary, color: THEME.primary }}
                      >
                        Download
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* SAVED LOOKS */}
        {activeView === "saved" && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
              <Typography variant="h5" fontWeight={700}>
                💖 Saved Looks ({savedLooks.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  console.log("🔄 Manual refresh triggered");
                  fetchSavedLooks();
                }}
                sx={{ borderColor: THEME.primary, color: THEME.primary }}
              >
                Refresh
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: THEME.primary }} />
              </Box>
            ) : savedLooks.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <FavoriteIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Saved Looks Yet
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Save your favorite try-on looks to build your collection
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  💡 Tip: Open browser console (F12) to see debug logs
                </Typography>
              </Box>
            ) : (
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
                {savedLooks.map((look) => (
                  <Card
                    key={look.id}
                    sx={{
                      borderRadius: 2,
                      position: "relative",
                      border: "2px solid #FFB6C1",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 8px 24px rgba(255,182,193,0.3)",
                      },
                    }}
                  >
                    <Chip
                      icon={<FavoriteIcon sx={{ fontSize: 16 }} />}
                      label="Saved"
                      size="small"
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        bgcolor: "rgba(255,255,255,0.95)",
                        color: "#e91e63",
                        fontWeight: 700,
                        zIndex: 1
                      }}
                    />

                    <Box
                      sx={{
                        height: 300,
                        position: "relative",
                        cursor: "pointer",
                        bgcolor: "#f5f5f5"
                      }}
                      onClick={() => setSelectedImage(look)}
                    >
                      <CardMedia
                        component="img"
                        image={look.image_data}
                        alt="Saved look"
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                      
                      <IconButton
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "rgba(255,255,255,0.9)",
                          "&:hover": { bgcolor: "rgba(255,255,255,1)", color: "#d32f2f" }
                        }}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsaveLook(look.id);
                        }}
                        disabled={deleting === look.id}
                      >
                        {deleting === look.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>

                    <CardContent>
                      <Typography fontSize={14} fontWeight={700} noWrap>
                        {look.product_name || "Unknown Product"}
                      </Typography>
                      <Typography fontSize={16} fontWeight={700} color="primary" sx={{ mb: 1 }}>
                        {look.product_price || "N/A"}
                      </Typography>
                      <Typography fontSize={12} color="text.secondary">
                        Saved on {new Date(look.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload(look.image_data, look.product_name)}
                        sx={{ bgcolor: THEME.primary }}
                      >
                        Download
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* FULL SCREEN IMAGE DIALOG */}
        <Dialog
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          maxWidth="md"
          fullWidth
        >
          {selectedImage && (
            <Box sx={{ position: "relative" }}>
              <IconButton
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor: "rgba(255,255,255,0.9)",
                  zIndex: 1,
                  "&:hover": { bgcolor: "rgba(255,255,255,1)" }
                }}
                onClick={() => setSelectedImage(null)}
              >
                <CloseIcon />
              </IconButton>
              
              {selectedImage.is_saved && (
                <Chip
                  icon={<FavoriteIcon />}
                  label="Saved Look"
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    bgcolor: "rgba(255,255,255,0.95)",
                    color: "#e91e63",
                    fontWeight: 700,
                    zIndex: 1
                  }}
                />
              )}

              <DialogContent sx={{ p: 0 }}>
                <img
                  src={selectedImage.image_data}
                  alt="Full view"
                  style={{ width: "100%", display: "block" }}
                />
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedImage.product_name}
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight={800} sx={{ mt: 1 }}>
                    {selectedImage.product_price}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    {activeView === "saved" ? "Saved" : "Captured"} on {new Date(selectedImage.created_at).toLocaleString()}
                  </Typography>
                  
                  <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(selectedImage.image_data, selectedImage.product_name)}
                      sx={{ bgcolor: THEME.primary }}
                    >
                      Download
                    </Button>
                  </Box>
                </Box>
              </DialogContent>
            </Box>
          )}
        </Dialog>
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={700}>
          Recommended For You
        </Typography>
        <RecommendationWidget
          type="history-based"
          count={4}
          compact={true}
        />
        <Button
          component={Link}
          to="/recommendations"
          sx={{ mt: 2 }}
        >
          View All Recommendations
        </Button>
      </Box>
      {/* ── SNACKBAR ── */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%", fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}