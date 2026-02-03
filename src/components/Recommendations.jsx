import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Skeleton,
  Snackbar,
  Alert
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { supabase } from "../lib/supabaseClient";
import {
  getHistoryBasedRecommendations,
  getFavoritesBasedRecommendations,
  getTrendingRecommendations,
  getMixedRecommendations
} from "../utils/recommendationEngine";

const THEME = {
  primary: "#6C5CE7",
  gradient: "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB"
};

/* ================= RECOMMENDATIONS PAGE ================= */
export default function Recommendations() {
  const navigate = useNavigate();
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedProducts, setSavedProducts] = useState(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [activeTab, setActiveTab] = useState("mixed"); // mixed, history, favorites, trending

  useEffect(() => {
    loadRecommendations();
    fetchSavedProductIds();
  }, [activeTab]);

  /* ---------------- LOAD RECOMMENDATIONS ---------------- */
  async function loadRecommendations() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guest user - show trending
        const trending = getTrendingRecommendations("men", 9);
        setRecommendations(trending);
        setLoading(false);
        return;
      }

      // Fetch user data
      const [historyRes, favoritesRes] = await Promise.all([
        supabase
          .from("tryon_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("closet_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)
      ]);

      const history = historyRes.data || [];
      const favorites = favoritesRes.data || [];

      // Determine user's preferred gender based on history
      let userGender = "men"; // default
      // You could determine this from user profile or history

      let recs = [];
      switch (activeTab) {
        case "history":
          recs = getHistoryBasedRecommendations(history, 9);
          break;
        case "favorites":
          recs = getFavoritesBasedRecommendations(favorites, 9);
          break;
        case "trending":
          recs = getTrendingRecommendations(userGender, 9);
          break;
        case "mixed":
        default:
          recs = getMixedRecommendations(history, favorites, userGender, 9);
          break;
      }

      setRecommendations(recs);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      // Fallback to trending
      const trending = getTrendingRecommendations("men", 9);
      setRecommendations(trending);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- FETCH SAVED PRODUCT IDS ---------------- */
  async function fetchSavedProductIds() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("closet_items")
        .select("product_id")
        .eq("user_id", user.id);
      
      if (data) {
        setSavedProducts(new Set(data.map(r => String(r.product_id))));
      }
    } catch (err) {
      console.error("fetchSavedProductIds:", err);
    }
  }

  /* ---------------- SAVE TO CLOSET ---------------- */
  async function saveToCloset(product, event) {
    event?.stopPropagation();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSnackbar({ open: true, message: "Please login to save items", severity: "warning" });
        return;
      }

      const productId = String(product.id);

      // Toggle: if already saved, remove it
      if (savedProducts.has(productId)) {
        await supabase
          .from("closet_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        
        setSavedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        
        setSnackbar({ open: true, message: "Removed from closet", severity: "info" });
        return;
      }

      // Add to closet
      const { error } = await supabase
        .from("closet_items")
        .insert({
          user_id: user.id,
          product_id: productId,
          product_name: product.title,
          product_price: product.price,
          product_image: product.image,
          product_url: product.url || product.product_url,
          category: product.gender || product.category || "men",
          status: "favorite"
        });

      if (error) throw error;

      setSavedProducts(prev => new Set([...prev, productId]));
      setSnackbar({ open: true, message: "Added to closet!", severity: "success" });
    } catch (err) {
      console.error("Save failed:", err);
      setSnackbar({ open: true, message: "Failed to save", severity: "error" });
    }
  }

  /* ---------------- TRY ON ---------------- */
  function handleTryOn(product) {
    navigate("/upload", {
      state: {
        image: product.image,
        title: product.title,
        price: product.price,
        buyUrl: product.url || product.product_url,
        productId: product.id
      }
    });
  }

  /* ---------------- BUY ---------------- */
  function handleBuy(product, event) {
    event?.stopPropagation();
    const url = product.url || product.product_url;
    if (url) {
      window.open(url, "_blank");
    }
  }

  /* ---------------- RENDER PRODUCT CARD ---------------- */
  function ProductCard({ product }) {
    const isSaved = savedProducts.has(String(product.id));

    return (
      <Card
        sx={{
          borderRadius: 2,
          position: "relative",
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 8px 24px rgba(108,92,231,0.15)"
          }
        }}
      >
        {/* BADGE */}
        {product.badge && (
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
            label={product.badge}
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              bgcolor: "rgba(111, 93, 241, 0.95)",
              color: "white",
              fontWeight: 700,
              fontSize: 11,
              zIndex: 1,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
            }}
          />
        )}

        {/* SAVE BUTTON */}
        <IconButton
          onClick={(e) => saveToCloset(product, e)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(255,255,255,0.9)",
            zIndex: 1,
            "&:hover": {
              bgcolor: "white",
              transform: "scale(1.1)"
            }
          }}
          size="small"
        >
          {isSaved ? (
            <FavoriteIcon sx={{ color: "#e91e63", fontSize: 20 }} />
          ) : (
            <FavoriteBorderIcon sx={{ fontSize: 20 }} />
          )}
        </IconButton>

        {/* IMAGE */}
        <CardMedia
          component="img"
          image={product.image}
          alt={product.title}
          sx={{
            height: 280,
            objectFit: "cover",
            bgcolor: "#f5f5f5"
          }}
        />

        {/* CONTENT */}
        <CardContent sx={{ pb: 1 }}>
          <Typography
            fontSize={14}
            fontWeight={600}
            sx={{
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical"
            }}
          >
            {product.title}
          </Typography>
          
          <Typography fontSize={16} fontWeight={800} color={THEME.primary}>
            {product.price}
          </Typography>

          {/* CATEGORY CHIP */}
          <Chip
            label={product.gender === 'women' ? 'Women' : 'Men'}
            size="small"
            sx={{
              mt: 1,
              height: 20,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: product.gender === 'women' ? '#fce4ec' : '#e3f2fd',
              color: product.gender === 'women' ? '#e91e63' : '#2196f3'
            }}
          />
        </CardContent>

        {/* ACTIONS */}
        <Box sx={{ px: 2, pb: 2, display: "flex", gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<CameraAltIcon />}
            onClick={() => handleTryOn(product)}
            sx={{
              bgcolor: THEME.primary,
              fontWeight: 700,
              fontSize: 12,
              "&:hover": { bgcolor: "#5a4bc7" }
            }}
          >
            Try On
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<ShoppingBagIcon />}
            onClick={(e) => handleBuy(product, e)}
            sx={{
              borderColor: THEME.primary,
              color: THEME.primary,
              fontWeight: 700,
              fontSize: 12,
              "&:hover": {
                borderColor: "#5a4bc7",
                bgcolor: `${THEME.primary}10`
              }
            }}
          >
            Buy
          </Button>
        </Box>
      </Card>
    );
  }

  /* ---------------- SKELETON LOADER ---------------- */
  function SkeletonCard() {
    return (
      <Card sx={{ borderRadius: 2 }}>
        <Skeleton variant="rectangular" height={280} />
        <CardContent>
          <Skeleton variant="text" height={24} width="80%" />
          <Skeleton variant="text" height={20} width="40%" sx={{ mt: 1 }} />
          <Skeleton variant="rectangular" height={20} width={60} sx={{ mt: 1, borderRadius: 10 }} />
        </CardContent>
        <Box sx={{ px: 2, pb: 2 }}>
          <Skeleton variant="rectangular" height={32} sx={{ borderRadius: 1 }} />
        </Box>
      </Card>
    );
  }

  /* ================= RENDER ================= */
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg, pb: 6 }}>
      {/* HEADER */}
      <Box
        sx={{
          background: THEME.gradient,
          color: "#1a1a1a",
          py: 4,
          px: 3,
          mb: 3
        }}
      >
        <Typography variant="h4" fontWeight={800} gutterBottom>
          ✨ Recommendations
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8 }}>
          Discover items picked just for you
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3 }}>
        {/* TABS */}
        <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
          {[
            { key: "mixed", label: "For You", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} /> },
            { key: "history", label: "Similar to Your Try-Ons", icon: <CameraAltIcon sx={{ fontSize: 16 }} /> },
            { key: "favorites", label: "Based on Favorites", icon: <FavoriteIcon sx={{ fontSize: 16 }} /> },
            { key: "trending", label: "Trending", icon: <TrendingUpIcon sx={{ fontSize: 16 }} /> }
          ].map(tab => (
            <Chip
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              onClick={() => setActiveTab(tab.key)}
              sx={{
                fontWeight: 700,
                fontSize: 13,
                height: 36,
                px: 1,
                bgcolor: activeTab === tab.key ? THEME.primary : "white",
                color: activeTab === tab.key ? "white" : "#555",
                border: activeTab === tab.key ? "none" : "1px solid #ddd",
                "&:hover": {
                  bgcolor: activeTab === tab.key ? "#5a4bc7" : "#f5f5f5"
                }
              }}
            />
          ))}
        </Box>

        {/* GRID */}
        {loading ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)"
              },
              gap: 3
            }}
          >
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonCard key={i} />
            ))}
          </Box>
        ) : recommendations.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <AutoAwesomeIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Recommendations Yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Start trying on products to get personalized recommendations
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/dashboard")}
              sx={{ bgcolor: THEME.primary, fontWeight: 700 }}
            >
              Browse Products
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)"
              },
              gap: 3
            }}
          >
            {recommendations.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Box>
        )}
      </Box>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}