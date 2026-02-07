import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  IconButton,
  Chip
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { supabase } from "../lib/supabaseClient";
import {
  getSimilarProducts,
  getClosetBasedRecommendations,
  getHistoryBasedRecommendations
} from "../utils/recommendationEngine";

const THEME = {
  primary: "#6C5CE7"
};

/**
 * Compact Recommendation Widget
 * Used in TryOn page and MyCloset page
 * 
 * Props:
 * - type: 'similar' | 'closet-based' | 'history-based'
 * - currentProduct: product object (for similar recommendations)
 * - savedLooks: array (for closet-based)
 * - closetItems: array (for closet-based)
 * - title: custom title
 * - count: number of items to show (default 4)
 */
export default function RecommendationWidget({
  type = "similar",
  currentProduct = null,
  savedLooks = [],
  closetItems = [],
  title = "You May Also Like",
  count = 4,
  compact = false
}) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [savedProducts, setSavedProducts] = useState(new Set());
  const abortControllerRef = React.useRef(null);

  useEffect(() => {
    // Create abort controller for this effect
    abortControllerRef.current = new AbortController();
    
    const loadData = async () => {
      try {
        await loadRecommendations();
        await fetchSavedProductIds();
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error loading recommendations:', err);
        }
      }
    };
    
    loadData();

    return () => {
      // Abort any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [type, currentProduct, savedLooks, closetItems]);

  async function loadRecommendations() {
    let recs = [];

    try {
      switch (type) {
        case "similar":
          if (currentProduct) {
            recs = getSimilarProducts(currentProduct, count);
          }
          break;

        case "closet-based":
          recs = getClosetBasedRecommendations(savedLooks, closetItems, count);
          break;

        case "history-based":
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && abortControllerRef.current) {
              const { data: history } = await supabase
                .from("tryon_history")
                .select("*")
                .eq("user_id", user.id)
                .limit(20);
              
              // Check if request was aborted
              if (abortControllerRef.current.signal.aborted) return;
              
              recs = getHistoryBasedRecommendations(history || [], count);
            }
          } catch (err) {
            if (err.name !== 'AbortError') {
              console.error("Failed to load history:", err);
            }
            return;
          }
          break;

        default:
          break;
      }

      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setRecommendations(recs);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error in loadRecommendations:', err);
      }
    }
  }

  async function fetchSavedProductIds() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !abortControllerRef.current) return;

      const { data } = await supabase
        .from("closet_items")
        .select("product_id")
        .eq("user_id", user.id);

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) return;
      
      if (data) {
        setSavedProducts(new Set(data.map(r => String(r.product_id))));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("fetchSavedProductIds:", err);
      }
    }
  }

  async function saveToCloset(product, event) {
    event?.stopPropagation();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        return;
      }

      await supabase.from("closet_items").insert({
        user_id: user.id,
        product_id: productId,
        product_name: product.title,
        product_price: product.price,
        product_image: product.image,
        product_url: product.url || product.product_url,
        category: product.gender || product.category || "men",
        status: "favorite"
      });

      setSavedProducts(prev => new Set([...prev, productId]));
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

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

  function handleBuy(product, event) {
    event?.stopPropagation();
    const url = product.url || product.product_url;
    if (url) {
      window.open(url, "_blank");
    }
  }

  if (recommendations.length === 0) return null;

  return (
    <Box sx={{ mt: compact ? 2 : 4, mb: compact ? 2 : 4 }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Button
          endIcon={<ChevronRightIcon />}
          onClick={() => navigate("/recommendations")}
          sx={{
            color: THEME.primary,
            fontWeight: 600,
            fontSize: 13,
            "&:hover": { bgcolor: `${THEME.primary}10` }
          }}
        >
          View All
        </Button>
      </Box>

      {/* HORIZONTAL SCROLL GRID */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 2,
          "&::-webkit-scrollbar": {
            height: 8
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: "#f1f1f1",
            borderRadius: 10
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: THEME.primary,
            borderRadius: 10,
            "&:hover": {
              bgcolor: "#5a4bc7"
            }
          }
        }}
      >
        {recommendations.map(product => {
          const isSaved = savedProducts.has(String(product.id));

          return (
            <Card
              key={product.id}
              sx={{
                minWidth: compact ? 160 : 200,
                maxWidth: compact ? 160 : 200,
                borderRadius: 2,
                position: "relative",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 6px 20px rgba(108,92,231,0.15)"
                }
              }}
            >
              {/* BADGE */}
              {product.badge && (
                <Chip
                  label={product.badge}
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    bgcolor: "rgba(108,92,231,0.95)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 9,
                    height: 18,
                    zIndex: 1,
                    "& .MuiChip-label": { px: 1 }
                  }}
                />
              )}

              {/* SAVE BUTTON */}
              <IconButton
                onClick={(e) => saveToCloset(product, e)}
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  bgcolor: "rgba(255,255,255,0.9)",
                  width: 28,
                  height: 28,
                  zIndex: 1,
                  "&:hover": {
                    bgcolor: "white",
                    transform: "scale(1.1)"
                  }
                }}
              >
                {isSaved ? (
                  <FavoriteIcon sx={{ color: "#e91e63", fontSize: 16 }} />
                ) : (
                  <FavoriteBorderIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>

              {/* IMAGE */}
              <CardMedia
                component="img"
                image={product.image}
                alt={product.title}
                sx={{
                  height: compact ? 180 : 220,
                  objectFit: "cover",
                  bgcolor: "#f5f5f5"
                }}
              />

              {/* CONTENT */}
              <CardContent sx={{ p: 1.5, pb: 1 }}>
                <Typography
                  fontSize={compact ? 11 : 12}
                  fontWeight={600}
                  sx={{
                    mb: 0.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    minHeight: compact ? 28 : 32
                  }}
                >
                  {product.title}
                </Typography>

                <Typography
                  fontSize={compact ? 13 : 14}
                  fontWeight={800}
                  color={THEME.primary}
                >
                  {product.price}
                </Typography>
              </CardContent>

              {/* ACTIONS */}
              <Box sx={{ px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<CameraAltIcon sx={{ fontSize: 14 }} />}
                  onClick={() => handleTryOn(product)}
                  sx={{
                    bgcolor: THEME.primary,
                    fontWeight: 700,
                    fontSize: 10,
                    py: 0.5,
                    "&:hover": { bgcolor: "#5a4bc7" }
                  }}
                >
                  Try On
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<ShoppingBagIcon sx={{ fontSize: 14 }} />}
                  onClick={(e) => handleBuy(product, e)}
                  sx={{
                    borderColor: THEME.primary,
                    color: THEME.primary,
                    fontWeight: 700,
                    fontSize: 10,
                    py: 0.5,
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
        })}
      </Box>
    </Box>
  );
}