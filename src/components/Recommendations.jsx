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
  Alert,
  Container,
  useMediaQuery,
  useTheme
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  pageBg: "#F6F7FB"
};

/* ================= RECOMMENDATIONS PAGE ================= */
export default function Recommendations() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedProducts, setSavedProducts] = useState(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [activeTab, setActiveTab] = useState("mixed");

  useEffect(() => {
    loadRecommendations();
    fetchSavedProductIds();
  }, [activeTab]);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const trending = getTrendingRecommendations("men", 9);
        setRecommendations(trending);
        setLoading(false);
        return;
      }

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
      let userGender = "men";

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
      const trending = getTrendingRecommendations("men", 9);
      setRecommendations(trending);
    } finally {
      setLoading(false);
    }
  }

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

  async function saveToCloset(product, event) {
    event?.stopPropagation();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSnackbar({ open: true, message: "Please login to save items", severity: "warning" });
        return;
      }

      const productId = String(product.id);

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

  function handleTryOn(product) {
    navigate("/upload-tryon", {
      state: {
        image: product.image,
        name: product.title,
        price: product.price,
        link: product.url || product.product_url,
        productId: product.id
      }
    });
  }

  function handleBuy(product, event) {
    event?.stopPropagation();
    const url = product.url || product.product_url;
    if (url) {
      window.open(url, "_blank");
    }
  }

  function ProductCard({ product }) {
    const isSaved = savedProducts.has(String(product.id));

    return (
      <Card
        sx={{
          borderRadius: 3,
          position: "relative",
          transition: "transform 0.2s, box-shadow 0.2s",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 12px 28px rgba(108,92,231,0.2)"
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
              bgcolor: "rgba(108,92,231,0.95)",
              color: "white",
              fontWeight: 700,
              fontSize: 10,
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
            bgcolor: "rgba(255,255,255,0.95)",
            zIndex: 1,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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
            height: isMobile ? 220 : 280,
            objectFit: "cover",
            bgcolor: "#f5f5f5"
          }}
        />

        {/* CONTENT */}
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Typography
            fontSize={isMobile ? 13 : 14}
            fontWeight={600}
            sx={{
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              minHeight: isMobile ? 36 : 40
            }}
          >
            {product.title}
          </Typography>
          
          <Typography fontSize={isMobile ? 15 : 16} fontWeight={800} color={THEME.primary}>
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
        <Box sx={{ px: 2, pb: 2, display: "flex", gap: 1, flexDirection: isMobile ? "column" : "row" }}>
          <Button
            fullWidth
            variant="contained"
            size={isMobile ? "medium" : "small"}
            startIcon={<CameraAltIcon />}
            onClick={() => handleTryOn(product)}
            sx={{
              bgcolor: THEME.primary,
              fontWeight: 700,
              fontSize: isMobile ? 13 : 12,
              py: isMobile ? 1.2 : 0.8,
              "&:hover": { bgcolor: "#5a4bc7" }
            }}
          >
            Try On
          </Button>
          
          <Button
            fullWidth={isMobile}
            variant="outlined"
            size={isMobile ? "medium" : "small"}
            startIcon={<ShoppingBagIcon />}
            onClick={(e) => handleBuy(product, e)}
            sx={{
              borderColor: THEME.primary,
              color: THEME.primary,
              fontWeight: 700,
              fontSize: isMobile ? 13 : 12,
              py: isMobile ? 1.2 : 0.8,
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

  function SkeletonCard() {
    return (
      <Card sx={{ borderRadius: 3 }}>
        <Skeleton variant="rectangular" height={isMobile ? 220 : 280} />
        <CardContent>
          <Skeleton variant="text" height={24} width="80%" />
          <Skeleton variant="text" height={20} width="40%" sx={{ mt: 1 }} />
          <Skeleton variant="rectangular" height={20} width={60} sx={{ mt: 1, borderRadius: 10 }} />
        </CardContent>
        <Box sx={{ px: 2, pb: 2 }}>
          <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
        </Box>
      </Card>
    );
  }

  const tabs = [
    { key: "mixed", label: isMobile ? "For You" : "For You", icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} /> },
    { key: "history", label: isMobile ? "History" : "Similar to Your Try-Ons", icon: <CameraAltIcon sx={{ fontSize: 16 }} /> },
    { key: "favorites", label: isMobile ? "Favorites" : "Based on Favorites", icon: <FavoriteIcon sx={{ fontSize: 16 }} /> },
    { key: "trending", label: "Trending", icon: <TrendingUpIcon sx={{ fontSize: 16 }} /> }
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg, pb: 6 }}>
      {/* HEADER */}
      <Box
        sx={{
          background: THEME.gradient,
          color: "white",
          py: isMobile ? 2 : 3,
          px: 2
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: isMobile ? 1 : 2 }}>
            <IconButton 
              onClick={() => navigate("/dashboard")} 
              sx={{ 
                color: "white",
                bgcolor: "rgba(255,255,255,0.15)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.25)"
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight={800}>
              ✨ Recommendations
            </Typography>
          </Box>
          {!isMobile && (
            <Typography variant="body1" sx={{ opacity: 0.9, ml: 7 }}>
              Discover items picked just for you
            </Typography>
          )}
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 3, px: 2 }}>
        {/* TABS */}
        <Box 
          sx={{ 
            display: "flex", 
            gap: 1, 
            mb: 3, 
            flexWrap: "wrap",
            overflowX: isMobile ? "auto" : "visible",
            "&::-webkit-scrollbar": {
              height: 6
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: THEME.primary,
              borderRadius: 3
            }
          }}
        >
          {tabs.map(tab => (
            <Chip
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              onClick={() => setActiveTab(tab.key)}
              sx={{
                fontWeight: 700,
                fontSize: isMobile ? 12 : 13,
                height: isMobile ? 32 : 36,
                px: isMobile ? 0.5 : 1,
                bgcolor: activeTab === tab.key ? THEME.primary : "white",
                color: activeTab === tab.key ? "white" : "#555",
                border: activeTab === tab.key ? "none" : "1px solid #ddd",
                whiteSpace: "nowrap",
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
                xs: "repeat(2, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)"
              },
              gap: isMobile ? 2 : 3
            }}
          >
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonCard key={i} />
            ))}
          </Box>
        ) : recommendations.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <AutoAwesomeIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
              No Recommendations Yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, px: 2 }}>
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
                xs: "repeat(2, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)"
              },
              gap: isMobile ? 2 : 3
            }}
          >
            {recommendations.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </Box>
        )}
      </Container>

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