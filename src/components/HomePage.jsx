// HomePage.jsx
import React from "react";
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  InputBase,
  Paper,
  Container,
  Avatar,
  Rating,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useNavigate } from "react-router-dom";

// COMPONENTS
import AnimatedLogo from "../components/AnimatedLogo";

// IMAGES
import heroImage from "../assets/hero-models.png";
import IconTryOn from "../assets/features/virtual-tryon.png";
import IconSmartAI from "../assets/features/smart-fit.png";
import IconCloset from "../assets/features/personal-closet.png";

export default function HomePage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { label: "Shop", path: "/shop" },
    { label: "Try-On", path: "/tryon" },
    { label: "Collections", path: "/collections" },
    { label: "About", path: "/about" },
  ];

  const categories = [
    { name: "Casual Wear", color: "#FFE5E5" },
    { name: "Formal Attire", color: "#E5F3FF" },
    { name: "Sportswear", color: "#E8FFE5" },
    { name: "Evening Wear", color: "#FFF3E5" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Fashion Blogger",
      rating: 5,
      text: "VirtualFit changed how I shop online. The virtual try-on is incredibly accurate!",
    },
    {
      name: "Michael Chen",
      role: "Software Engineer",
      rating: 5,
      text: "Finally, an app that understands fit. No more returns or sizing issues.",
    },
    {
      name: "Emma Williams",
      role: "Designer",
      rating: 5,
      text: "The AI styling suggestions are spot-on. It's like having a personal stylist.",
    },
  ];

  return (
    <Box sx={{ bgcolor: "#F6F7FB", overflowX: "hidden" }}>
      {/* ================= FIXED BLUR HEADER ================= */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled
            ? "rgba(255,255,255,0.85)"
            : "rgba(255,255,255,0.65)",
          backdropFilter: scrolled ? "blur(16px)" : "blur(8px)",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "blur(8px)",
          borderBottom: scrolled
            ? "1px solid rgba(0,0,0,0.12)"
            : "1px solid rgba(0,0,0,0.04)",
          transition: "all 0.3s ease",
          zIndex: 1200,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            sx={{
              minHeight: scrolled ? { xs: 56, md: 64 } : { xs: 64, md: 72 },
              transition: "min-height 0.3s ease",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {/* LOGO */}
            <Box
              onClick={() => navigate("/")}
              sx={{
                cursor: "pointer",
                transform: scrolled ? "scale(0.95)" : "scale(1)",
                transition: "transform 0.3s ease",
              }}
            >
              <AnimatedLogo size={scrolled ? 38 : 44} />
            </Box>

            {/* NAV LINKS WITH HOVER EFFECT */}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}>
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: "#2B2345",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      color: "#6C5CE7",
                      bgcolor: "rgba(108, 92, 231, 0.08)",
                      transform: "translateY(-2px)",
                    },
                    "&:active": {
                      transform: "translateY(0)",
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            {/* RIGHT */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {/* SEARCH WITH HOVER */}
              <Paper
                sx={{
                  display: { xs: "none", md: "flex" },
                  alignItems: "center",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 3,
                  bgcolor: "#F6F7FB",
                  border: "2px solid transparent",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: "white",
                    borderColor: "#6C5CE7",
                    boxShadow: "0 4px 12px rgba(108, 92, 231, 0.15)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <SearchIcon sx={{ color: "#888", fontSize: 20 }} />
                <InputBase
                  placeholder="Search..."
                  sx={{ ml: 1, width: 180, fontSize: "0.9rem" }}
                />
              </Paper>

              {/* LOGIN WITH HOVER */}
              <Button
                onClick={() => navigate("/login")}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: "#2B2345",
                  fontWeight: 600,
                  textTransform: "none",
                  px: 2,
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: "rgba(108, 92, 231, 0.08)",
                    color: "#6C5CE7",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Login
              </Button>

              {/* SIGNUP WITH HOVER */}
              <Button
                variant="contained"
                onClick={() => navigate("/signup")}
                sx={{
                  bgcolor: "#6C5CE7",
                  color: "white",
                  fontWeight: 600,
                  textTransform: "none",
                  px: 2.5,
                  py: 0.75,
                  borderRadius: 2,
                  boxShadow: "0 4px 14px rgba(108, 92, 231, 0.4)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: "#5849c7",
                    boxShadow: "0 6px 20px rgba(108, 92, 231, 0.6)",
                    transform: "translateY(-3px)",
                  },
                  "&:active": {
                    transform: "translateY(-1px)",
                  },
                }}
              >
                Sign Up
              </Button>

              <IconButton
                sx={{
                  display: { xs: "inline-flex", md: "none" },
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: "rgba(108, 92, 231, 0.08)",
                    transform: "rotate(90deg)",
                  },
                }}
                onClick={() => setMobileMenuOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Toolbar />

      {/* ================= HERO (SHORTER) ================= */}
      <Box
        sx={{
          minHeight: "50vh",
          px: { xs: 3, md: 8 },
          py: { xs: 4, md: 6 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #dbe9ff 0%, #e3d3f7 50%, #f8d9e3 100%)",
        }}
      >
        <Box maxWidth={500}>
          <Typography
            sx={{
              fontSize: { xs: "1.8rem", md: "2.4rem" },
              fontWeight: 700,
              fontFamily: "Playfair Display, serif",
              color: "#2B2345",
              lineHeight: 1.2,
            }}
          >
            DISCOVER YOUR PERFECT FIT
          </Typography>

          <Typography sx={{ mt: 2, fontSize: "1.1rem", color: "#555" }}>
            Virtual try-ons. AI styling. Personalized closets.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => navigate("/tryon")}
              sx={{
                bgcolor: "#6C5CE7",
                px: 3,
                py: 1.2,
                fontSize: "1rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                boxShadow: "0 4px 14px rgba(108, 92, 231, 0.4)",
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor: "#5849c7",
                  transform: "translateY(-3px)",
                  boxShadow: "0 6px 20px rgba(108, 92, 231, 0.6)",
                },
              }}
            >
              Shop Now
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: "#6C5CE7",
                color: "#6C5CE7",
                px: 3,
                py: 1.2,
                fontSize: "1rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                borderWidth: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  borderWidth: 2,
                  bgcolor: "rgba(108, 92, 231, 0.08)",
                  transform: "translateY(-3px)",
                },
              }}
            >
              Explore More
            </Button>
          </Box>
        </Box>

        <Box
          component="img"
          src={heroImage}
          alt="Models"
          sx={{
            width: { md: 300, lg: 350 },
            height: "auto",
            borderRadius: 3,
            display: { xs: "none", md: "block" },
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          }}
        />
      </Box>

      {/* ================= FEATURES ================= */}
      <Box sx={{ py: 8, px: 3 }}>
        <Typography
          variant="h4"
          fontWeight={700}
          textAlign="center"
          mb={6}
          color="#2B2345"
        >
          WHY CHOOSE VIRTUALFIT?
        </Typography>

        <Grid container spacing={4} justifyContent="center" maxWidth="lg" mx="auto">
          {[
            {
              icon: IconTryOn,
              title: "Virtual Try-On",
              desc: "Try clothes instantly with AI-powered visualization",
            },
            {
              icon: IconSmartAI,
              title: "Smart Fit AI",
              desc: "Get perfect fit suggestions based on your measurements",
            },
            {
              icon: IconCloset,
              title: "Personal Closet",
              desc: "Save and organize your favorite looks in one place",
            },
          ].map((item, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  transition: "all 0.3s ease",
                  border: "1px solid rgba(0,0,0,0.05)",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 12px 40px rgba(108, 92, 231, 0.2)",
                    borderColor: "#6C5CE7",
                  },
                }}
              >
                <CardContent sx={{ textAlign: "center" }}>
                  <Box component="img" src={item.icon} sx={{ width: 70, mb: 2 }} />
                  <Typography fontWeight={700} fontSize="1.1rem" mb={1}>
                    {item.title}
                  </Typography>
                  <Typography color="text.secondary" fontSize="0.95rem">
                    {item.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= TRENDING CATEGORIES ================= */}
      <Box sx={{ py: 8, px: 3, bgcolor: "white" }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" mb={2}>
          Explore Collections
        </Typography>
        <Typography textAlign="center" color="text.secondary" mb={6}>
          Browse through our curated fashion collections
        </Typography>

        <Grid container spacing={3} maxWidth="md" mx="auto" justifyContent="center">
          {categories.map((cat, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: cat.color,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                  "&:hover": {
                    transform: "translateY(-8px) scale(1.02)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
                  },
                }}
                onClick={() => navigate("/collections")}
              >
                <Typography fontWeight={700} fontSize="1.1rem" mb={1}>
                  {cat.name}
                </Typography>
                <Typography color="text.secondary" fontSize="0.9rem">
                  Discover Now
                </Typography>
                <TrendingUpIcon sx={{ mt: 2, color: "#6C5CE7" }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= BENEFITS ================= */}
      <Box sx={{ py: 8, px: 3 }}>
        <Grid container spacing={4} maxWidth="md" mx="auto" justifyContent="center">
          {[
            {
              icon: <LocalShippingOutlinedIcon sx={{ fontSize: 40 }} />,
              title: "Fast Delivery",
              desc: "Quick shipping on all orders",
            },
            {
              icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 40 }} />,
              title: "Quality Assured",
              desc: "Premium quality products",
            },
            {
              icon: <SupportAgentOutlinedIcon sx={{ fontSize: 40 }} />,
              title: "24/7 Support",
              desc: "Always here to help you",
            },
          ].map((item, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Box
                sx={{
                  textAlign: "center",
                  p: 3,
                  borderRadius: 3,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: "rgba(108, 92, 231, 0.05)",
                    transform: "translateY(-5px)",
                  },
                }}
              >
                <Box sx={{ color: "#6C5CE7", mb: 2 }}>{item.icon}</Box>
                <Typography fontWeight={700} fontSize="1.1rem" mb={1}>
                  {item.title}
                </Typography>
                <Typography color="text.secondary">{item.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= TESTIMONIALS ================= */}
      <Box sx={{ py: 8, px: 3, bgcolor: "white" }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" mb={6}>
          What Our Customers Say
        </Typography>

        <Grid container spacing={4} maxWidth="lg" mx="auto" justifyContent="center">
          {testimonials.map((test, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 12px 30px rgba(108, 92, 231, 0.15)",
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Rating value={test.rating} readOnly sx={{ mb: 2 }} />
                  <Typography fontSize="0.95rem" mb={3} color="text.secondary">
                    "{test.text}"
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: "#6C5CE7" }}>
                      {test.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={600}>{test.name}</Typography>
                      <Typography fontSize="0.85rem" color="text.secondary">
                        {test.role}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= CTA SECTION ================= */}
      <Box
        sx={{
          py: 8,
          px: 3,
          textAlign: "center",
          background: "linear-gradient(135deg, #6C5CE7 0%, #9D8CE7 100%)",
          color: "white",
        }}
      >
        <Typography variant="h3" fontWeight={700} mb={2}>
          Ready to Transform Your Wardrobe?
        </Typography>
        <Typography fontSize="1.2rem" mb={4}>
          Join thousands of satisfied customers today
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/signup")}
          sx={{
            bgcolor: "white",
            color: "#6C5CE7",
            px: 4,
            py: 1.5,
            fontSize: "1.1rem",
            fontWeight: 700,
            textTransform: "none",
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            transition: "all 0.3s ease",
            "&:hover": {
              bgcolor: "#f5f5f5",
              transform: "translateY(-5px)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            },
          }}
        >
          Get Started Free
        </Button>
      </Box>

      {/* ================= FOOTER ================= */}
      <Box sx={{ py: 6, px: 3, bgcolor: "#EDE9FF" }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} mb={4}>
            {/* BRAND SECTION */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <AnimatedLogo size={36} />
                <Typography fontWeight={700} fontSize="1.3rem" ml={1}>
                  VirtualFit
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ maxWidth: 300 }}>
                Your personal AI-powered fashion assistant for the perfect fit
              </Typography>
            </Grid>

            {/* SHOP LINKS */}
            <Grid item xs={6} sm={4} md={2}>
              <Typography fontWeight={700} mb={2} fontSize="1rem">
                Shop
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Women
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Men
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Kids
                </Typography>
              </Box>
            </Grid>

            {/* COMPANY LINKS */}
            <Grid item xs={6} sm={4} md={2}>
              <Typography fontWeight={700} mb={2} fontSize="1rem">
                Company
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  About
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Careers
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Blog
                </Typography>
              </Box>
            </Grid>

            {/* SUPPORT LINKS */}
            <Grid item xs={6} sm={4} md={2}>
              <Typography fontWeight={700} mb={2} fontSize="1rem">
                Support
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Help Center
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Contact
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Returns
                </Typography>
              </Box>
            </Grid>

            {/* LEGAL LINKS */}
            <Grid item xs={6} sm={4} md={2}>
              <Typography fontWeight={700} mb={2} fontSize="1rem">
                Legal
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Privacy
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Terms
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="0.9rem"
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { color: "#6C5CE7" },
                  }}
                >
                  Cookies
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* COPYRIGHT */}
          <Box
            sx={{
              textAlign: "center",
              pt: 4,
              borderTop: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <Typography fontWeight={600} color="text.secondary">
              © {new Date().getFullYear()} VirtualFit · All Rights Reserved
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ================= MOBILE DRAWER ================= */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <Box sx={{ p: 2, width: 260 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography fontWeight={700}>Menu</Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            {navItems.map((item) => (
              <ListItem
                button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  "&:hover": { bgcolor: "rgba(108, 92, 231, 0.08)" },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}