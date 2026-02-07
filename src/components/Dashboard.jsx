import React, { useEffect, useState } from "react";
import { 
  Box, Typography, Card, CardMedia, CardContent, Button, IconButton, 
  Snackbar, Alert, Tabs, Tab, CircularProgress, Container, useMediaQuery, useTheme,
  Drawer, Grid
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import Sidebar from "./Sidebar";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { hmMenTshirts } from "../data/hmMenTshirts";
import { hmWomenTshirts } from "../data/hmWomenTshirts";

const THEME = {
  gradient: "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
  primary: "#6C5CE7"
};

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [userName, setUserName] = useState("User");
  const [activeView, setActiveView] = useState("overview");
  const [productCategory, setProductCategory] = useState(0);
  const [history, setHistory] = useState([]);
  const [savedLooks, setSavedLooks] = useState([]);
  const [closetItems, setClosetItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedProducts, setSavedProducts] = useState(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUserName();
    loadProducts();
    fetchSavedProductIds();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [productCategory]);

  useEffect(() => {
    if (activeView === "history") {
      fetchHistory();
    } else if (activeView === "saved") {
      fetchSavedLooks();
    } else if (activeView === "closet") {
      fetchClosetItems();
    } else if (activeView === "recommendations") {
      fetchRecommendations();
    }
  }, [activeView]);

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

  function loadProducts() {
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

  async function fetchHistory() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Debug: Log the data to see what fields are available
      console.log("History data from DB:", data);
      if (data && data.length > 0) {
        console.log("First item fields:", Object.keys(data[0]));
      }
      
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSavedLooks() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_saved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Debug: Log the data to see what fields are available
      console.log("Saved looks data from DB:", data);
      if (data && data.length > 0) {
        console.log("First saved look fields:", Object.keys(data[0]));
      }
      
      setSavedLooks(data || []);
    } catch (err) {
      console.error("Failed to fetch saved looks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClosetItems() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("closet_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClosetItems(data || []);
    } catch (err) {
      console.error("Failed to fetch closet items:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecommendations() {
    setLoading(true);
    try {
      // For now, show random products as recommendations
      // You can implement AI-based recommendations later
      const allProducts = [...hmMenTshirts, ...hmWomenTshirts];
      const shuffled = allProducts.sort(() => 0.5 - Math.random());
      const recommended = shuffled.slice(0, 12).map((item, index) => ({
        id: item.id || index,
        title: item.title,
        price: item.price,
        image: item.image,
        product_url: item.url,
      }));
      setRecommendations(recommended);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
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
      
      if (data) setSavedProducts(new Set(data.map(r => String(r.product_id))));
    } catch (err) {
      console.error("fetchSavedProductIds:", err);
    }
  }

  async function saveToCloset(product) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const productId = String(product.id);

      if (savedProducts.has(productId)) {
        await supabase.from("closet_items").delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        setSavedProducts(prev => { const n = new Set(prev); n.delete(productId); return n; });
        setSnackbar({ open: true, message: "Removed from closet", severity: "info" });
        return;
      }

      await supabase.from("closet_items").insert({
        user_id: user.id,
        product_id: productId,
        product_name: product.title,
        product_price: product.price,
        product_image: product.image,
        product_url: product.product_url,
        category: productCategory === 0 ? "men" : "women",
        status: "favorite"
      });

      setSavedProducts(prev => new Set([...prev, productId]));
      setSnackbar({ open: true, message: "Added to closet!", severity: "success" });
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

  function handleTryOn(product) {
    console.log("Try On clicked for product:", product);
    console.log("Navigating to /live-tryon with state:", {
      garment_image: product.image,
      product_name: product.title,
      product_price: product.price,
      product_url: product.product_url,
      product_id: product.id
    });
    
    // Navigate to live try-on page with selected product
    navigate("/tryon", {
      state: {
        garment_image: product.image,
        product_name: product.title,
        product_price: product.price,
        product_url: product.product_url,
        product_id: product.id
      }
    });
  }

  function handleViewChange(view) {
    if (view === "upload-tryon") {
      // Navigate to upload try-on page without product pre-selected
      navigate("/upload-tryon");
    } else if (view === "profile") {
      navigate("/profile");
    } else {
      setActiveView(view);
    }
    
    if (isMobile) {
      setSidebarOpen(false);
    }
  }

  const ProductCard = ({ product }) => (
    <Card
      sx={{
        borderRadius: { xs: 2, md: 3 },
        overflow: "hidden",
        position: "relative",
        boxShadow: { xs: "0 1px 8px rgba(0,0,0,0.06)", md: "0 2px 12px rgba(0,0,0,0.08)" },
        transition: "all 0.25s ease",
        "&:hover": {
          transform: { xs: "none", md: "translateY(-4px)" },
          boxShadow: { xs: "0 2px 12px rgba(0,0,0,0.1)", md: "0 8px 24px rgba(108,92,231,0.15)" },
        },
      }}
    >
      <IconButton
        onClick={() => saveToCloset(product)}
        sx={{
          position: "absolute",
          top: { xs: 8, md: 12 },
          right: { xs: 8, md: 12 },
          zIndex: 2,
          width: { xs: 36, md: 44 },
          height: { xs: 36, md: 44 },
          bgcolor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          "&:hover": {
            bgcolor: "white",
            transform: "scale(1.08)"
          }
        }}
      >
        {savedProducts.has(String(product.id)) ? (
          <FavoriteIcon sx={{ color: "#e91e63", fontSize: { xs: 20, md: 24 } }} />
        ) : (
          <FavoriteBorderIcon sx={{ fontSize: { xs: 20, md: 24 }, color: "#666" }} />
        )}
      </IconButton>

      <Box
        sx={{
          width: "100%",
          aspectRatio: "3/4",
          bgcolor: "#fafafa",
          overflow: "hidden"
        }}
      >
        <CardMedia
          component="img"
          image={product.image}
          alt={product.title}
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/400x500/f0f0f0/666666?text=H%26M";
          }}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top"
          }}
        />
      </Box>

      <CardContent sx={{ 
        p: { xs: 2, md: 2.5 }, 
        pb: { xs: 1.5, md: 2 } 
      }}>
        <Typography
          fontSize={{ xs: 14, md: 15 }}
          fontWeight={600}
          sx={{
            mb: { xs: 0.8, md: 1 },
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.4,
            minHeight: { xs: 38, md: 42 }
          }}
        >
          {product.title}
        </Typography>

        <Typography 
          fontSize={{ xs: 17, md: 20 }} 
          fontWeight={800} 
          color={THEME.primary}
        >
          {product.price}
        </Typography>
      </CardContent>

      <Box sx={{ 
        px: { xs: 2, md: 2.5 }, 
        pb: { xs: 2, md: 2.5 }, 
        display: "flex", 
        flexDirection: "column", 
        gap: { xs: 1, md: 1.2 }
      }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => handleTryOn(product)}
          sx={{ 
            fontWeight: 700, 
            bgcolor: THEME.primary,
            fontSize: { xs: 13, md: 14 },
            py: { xs: 1.1, md: 1.4 },
            borderRadius: { xs: 1.5, md: 2 },
            textTransform: "none",
            boxShadow: "0 4px 12px rgba(108, 92, 231, 0.3)",
            "&:hover": {
              bgcolor: "#5a4bc7",
              boxShadow: "0 6px 16px rgba(108, 92, 231, 0.4)",
            }
          }}
        >
          Try On
        </Button>

        <Button
          fullWidth
          variant="outlined"
          onClick={() => window.open(product.product_url, "_blank")}
          sx={{ 
            fontWeight: 700,
            fontSize: { xs: 13, md: 14 },
            py: { xs: 1.1, md: 1.4 },
            borderRadius: { xs: 1.5, md: 2 },
            textTransform: "none",
            borderColor: THEME.primary,
            color: THEME.primary,
            borderWidth: 2,
            "&:hover": {
              borderWidth: 2,
              borderColor: "#5a4bc7",
              bgcolor: `${THEME.primary}08`
            }
          }}
        >
          Buy on H&M
        </Button>
      </Box>
    </Card>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg, display: "flex" }}>
      {!isMobile && (
        <Box
          sx={{
            width: 240,
            position: "fixed",
            height: "100vh",
            left: 0,
            top: 0,
            bgcolor: "white",
            borderRight: "1px solid #f0f0f0",
            zIndex: 1200,
          }}
        >
          <Sidebar userName={userName} activeView={activeView} onViewChange={handleViewChange} />
        </Box>
      )}

      {isMobile && (
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
            },
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: THEME.primary }}>
              Menu
            </Typography>
            <IconButton 
              onClick={() => setSidebarOpen(false)}
              sx={{ 
                '&:hover': { 
                  bgcolor: 'rgba(108, 92, 231, 0.1)' 
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ height: 'calc(100vh - 73px)', overflow: 'auto' }}>
            <Sidebar userName={userName} activeView={activeView} onViewChange={handleViewChange} />
          </Box>
        </Drawer>
      )}

      <Box 
        component="main"
        sx={{ 
          flexGrow: 1,
          ml: { xs: 0, md: "240px" },
          width: { xs: "100%", md: "calc(100% - 240px)" },
          minHeight: "100vh"
        }}
      >
        <Box sx={{ 
          p: { xs: 2, md: 3 }, 
          borderRadius: { xs: 0, md: 3 }, 
          background: THEME.gradient, 
          mb: { xs: 2, md: 3 },
          mx: { xs: 0, md: 3 },
          mt: { xs: 0, md: 3 },
          position: 'relative'
        }}>
          {isMobile && (
            <IconButton
              onClick={() => setSidebarOpen(true)}
              sx={{
                position: 'absolute',
                left: 8,
                top: 8,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  bgcolor: 'white',
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography sx={{ 
            fontSize: { xs: 18, md: 22 }, 
            fontWeight: 800,
            ml: { xs: isMobile ? 6 : 0, md: 0 }
          }}>
            Hi {userName} 👋
          </Typography>
          <Typography sx={{ 
            fontSize: { xs: 13, md: 15 },
            ml: { xs: isMobile ? 6 : 0, md: 0 }
          }}>
            {activeView === "overview" && "Try H&M outfits virtually"}
            {activeView === "recommendations" && "Personalized picks just for you"}
            {activeView === "history" && "View all your captured try-ons"}
            {activeView === "saved" && "Your favorite looks collection"}
            {activeView === "closet" && "Your personal closet collection"}
            {activeView === "upload-tryon" && "Upload your photo to try on outfits"}
          </Typography>
        </Box>

        <Container 
          maxWidth="lg" 
          sx={{ 
            px: { xs: 2, sm: 2.5, md: 3 },
            pb: { xs: 3, md: 4 }
          }}
        >
          {activeView === "overview" && (
            <Box>
              <Box sx={{ 
                mb: { xs: 2, md: 3 }, 
                borderBottom: 1, 
                borderColor: "divider",
                mx: { xs: -2, sm: 0 }
              }}>
                <Tabs 
                  value={productCategory} 
                  onChange={(e, newValue) => setProductCategory(newValue)}
                  variant={isMobile ? "scrollable" : "standard"}
                  scrollButtons={isMobile ? "auto" : false}
                  allowScrollButtonsMobile
                  sx={{
                    px: { xs: 2, sm: 0 },
                    "& .MuiTab-root": {
                      fontWeight: 700,
                      fontSize: { xs: "0.875rem", md: "1rem" },
                      textTransform: "none",
                      minHeight: { xs: 48, md: 48 },
                      minWidth: { xs: 120, sm: 140 }
                    },
                    "& .Mui-selected": { color: THEME.primary },
                    "& .MuiTabs-indicator": { backgroundColor: THEME.primary },
                  }}
                >
                  <Tab label="👕 Men's Collection" />
                  <Tab label="👗 Women's Collection" />
                </Tabs>
              </Box>

              <Typography sx={{ 
                fontWeight: 800, 
                fontSize: { xs: 18, md: 22 }, 
                mb: { xs: 2.5, md: 3 }
              }}>
                {productCategory === 0 ? "H&M Men T-Shirts 👕" : "H&M Women T-Shirts & Tops 👚"}
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(4, 1fr)",
                  },
                  gap: { xs: 2, sm: 2.5, md: 3 },
                  pb: { xs: 3, md: 5 }
                }}
              >
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </Box>
            </Box>
          )}

          {activeView === "recommendations" && (
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 24 }, mb: 3 }}>
                Recommended For You
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress sx={{ color: THEME.primary }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: { xs: 2, sm: 2.5, md: 3 },
                  }}
                >
                  {recommendations.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {activeView === "history" && (
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 24 }, mb: 3 }}>
                Try-On History
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress sx={{ color: THEME.primary }} />
                </Box>
              ) : history.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography color="text.secondary" fontSize={16}>No try-on history yet</Typography>
                  <Typography color="text.secondary" fontSize={14} mt={1}>
                    Start trying on outfits to see your history here
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: { xs: 2, sm: 2.5, md: 3 },
                  }}
                >
                  {history.map((item) => {
                    // image_data contains the captured try-on result!
                    const displayImage = item.image_data || item.image_url || item.product_image;
                    
                    return (
                      <Card key={item.id} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <CardMedia
                          component="img"
                          image={displayImage}
                          alt={item.item_id || item.product_name || "Try-on result"}
                          sx={{ 
                            aspectRatio: "3/4",
                            objectFit: "cover",
                            bgcolor: "#f5f5f5"
                          }}
                          onError={(e) => {
                            console.error("Image failed to load:", displayImage);
                            e.target.src = "https://via.placeholder.com/400x500/f0f0f0/666666?text=Image+Not+Found";
                          }}
                        />
                        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                          <Typography fontSize={{ xs: 12, md: 13 }} fontWeight={600} color="text.secondary">
                            {new Date(item.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Typography>
                          {(item.item_id || item.product_name) && (
                            <Typography fontSize={{ xs: 13, md: 14 }} fontWeight={600} noWrap mt={0.5}>
                              {item.item_id || item.product_name}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}

          {activeView === "saved" && (
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 24 }, mb: 3 }}>
                Saved Looks
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress sx={{ color: THEME.primary }} />
                </Box>
              ) : savedLooks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography color="text.secondary" fontSize={16}>No saved looks yet</Typography>
                  <Typography color="text.secondary" fontSize={14} mt={1}>
                    Save your favorite try-on results to see them here
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: { xs: 2, sm: 2.5, md: 3 },
                  }}
                >
                  {savedLooks.map((item) => {
                    // image_data contains the captured try-on result!
                    const displayImage = item.image_data || item.image_url || item.product_image;
                    
                    return (
                      <Card 
                        key={item.id} 
                        sx={{ 
                          borderRadius: 2, 
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <IconButton
                          onClick={async () => {
                            try {
                              await supabase
                                .from("tryon_history")
                                .update({ is_saved: false })
                                .eq("id", item.id);
                              
                              setSavedLooks(prev => prev.filter(look => look.id !== item.id));
                              setSnackbar({ 
                                open: true, 
                                message: "Removed from saved looks", 
                                severity: "info" 
                              });
                            } catch (err) {
                              console.error("Failed to unsave:", err);
                            }
                          }}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            width: { xs: 36, md: 40 },
                            height: { xs: 36, md: 40 },
                            bgcolor: "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(8px)",
                            "&:hover": {
                              bgcolor: "white",
                              transform: "scale(1.08)"
                            }
                          }}
                        >
                          <FavoriteIcon sx={{ color: "#e91e63", fontSize: { xs: 20, md: 24 } }} />
                        </IconButton>

                        <CardMedia
                          component="img"
                          image={displayImage}
                          alt={item.item_id || item.product_name || "Saved look"}
                          sx={{ 
                            aspectRatio: "3/4",
                            objectFit: "cover",
                            bgcolor: "#f5f5f5"
                          }}
                          onError={(e) => {
                            console.error("Image failed to load:", displayImage);
                            e.target.src = "https://via.placeholder.com/400x500/f0f0f0/666666?text=Image+Not+Found";
                          }}
                        />
                        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                          <Typography fontSize={{ xs: 12, md: 13 }} fontWeight={600} color="text.secondary">
                            {new Date(item.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Typography>
                          {(item.item_id || item.product_name) && (
                            <Typography fontSize={{ xs: 13, md: 14 }} fontWeight={600} noWrap mt={0.5}>
                              {item.item_id || item.product_name}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}

          {activeView === "closet" && (
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 24 }, mb: 3 }}>
                My Closet
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress sx={{ color: THEME.primary }} />
                </Box>
              ) : closetItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography color="text.secondary">Your closet is empty</Typography>
                  <Typography color="text.secondary" fontSize={14} mt={1}>
                    Add items by clicking the heart icon on products
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                      lg: "repeat(4, 1fr)",
                    },
                    gap: { xs: 2, sm: 2.5, md: 3 },
                  }}
                >
                  {closetItems.map((item) => (
                    <Card key={item.id} sx={{ borderRadius: 2 }}>
                      <CardMedia
                        component="img"
                        image={item.product_image}
                        alt={item.product_name}
                        sx={{ aspectRatio: "3/4", objectFit: "cover" }}
                      />
                      <CardContent sx={{ p: 2 }}>
                        <Typography fontSize={14} fontWeight={600} noWrap>
                          {item.product_name}
                        </Typography>
                        <Typography fontSize={17} fontWeight={800} color={THEME.primary}>
                          {item.product_price}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Container>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({...snackbar, open: false})} 
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity} 
          sx={{ fontWeight: 600 }} 
          onClose={() => setSnackbar({...snackbar, open: false})}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}