// HomePage.jsx – Final with Login & Signup Restored

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
  InputBase,
  Paper,
  Container,
  Avatar,
  Rating,
  Snackbar,
  Alert,
  Fade,
  Chip,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { useNavigate } from "react-router-dom";
import AnimatedLogo from "../components/AnimatedLogo";

// Images
import heroImage from "../assets/hero-models.png";
import IconTryOn from "../assets/features/virtual-tryon.png";
import IconSmartAI from "../assets/features/smart-fit.png";
import IconCloset from "../assets/features/personal-closet.png";

export default function HomePage() {
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", severity: "info" });
  const [hoveredFeature, setHoveredFeature] = React.useState(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    {
      icon: IconTryOn,
      title: "Virtual Try-On",
      desc: "See how outfits look on you instantly using AI",
    },
    {
      icon: IconSmartAI,
      title: "Smart Fit AI",
      desc: "Perfect size recommendations based on your body",
    },
    {
      icon: IconCloset,
      title: "Personal Closet",
      desc: "Save & manage your favorite looks",
    },
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
      text: "The virtual try-on feels magical. Shopping finally makes sense!",
      avatar: "S",
    },
    {
      name: "Michael Chen",
      role: "Software Engineer",
      text: "No more size guessing. This app is the future.",
      avatar: "M",
    },
    {
      name: "Emma Williams",
      role: "Designer",
      text: "Like having a personal stylist powered by AI.",
      avatar: "E",
    },
  ];

  return (
    <Box sx={{ bgcolor: "#F6F7FB", overflowX: "hidden" }}>
      {/* ================= HEADER ================= */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            {/* LOGO */}
            <Box
              onClick={() => scrollToSection("hero")}
              sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 1 }}
            >
              <AnimatedLogo size={40} />
              <Typography fontWeight={700}>VirtualFit</Typography>
            </Box>

            {/* CENTER BADGES */}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1.2 }}>
              {["AI Try-On", "Smart Fit", "Personal Closet"].map((item) => (
                <Chip
                  key={item}
                  label={item}
                  sx={{
                    bgcolor: "rgba(108,92,231,0.12)",
                    color: "#6C5CE7",
                    fontWeight: 600,
                  }}
                />
              ))}
            </Box>

            {/* RIGHT ACTIONS */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {/* SEARCH */}
              <Paper
                component="form"
                onSubmit={(e) => e.preventDefault()}
                sx={{
                  display: { xs: "none", md: "flex" },
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 3,
                }}
              >
                <SearchIcon />
                <InputBase
                  placeholder="Search outfits…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ ml: 1 }}
                />
              </Paper>

              {/* LOGIN */}
              <Button
                onClick={() => navigate("/login")}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: "#2B2345",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": { color: "#6C5CE7" },
                }}
              >
                Login
              </Button>

              {/* SIGN UP */}
              <Button
                onClick={() => navigate("/signup")}
                sx={{
                  bgcolor: "#6C5CE7",
                  color: "white",
                  fontWeight: 700,
                  textTransform: "none",
                  px: 2.5,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#5849c7" },
                }}
              >
                Sign Up
              </Button>

              {/* MOBILE MENU */}
              <IconButton sx={{ display: { md: "none" } }} onClick={() => setMobileMenuOpen(true)}>
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Toolbar />

      {/* ================= HERO ================= */}
      <Box
        id="hero"
        sx={{
          minHeight: "60vh",
          px: { xs: 3, md: 8 },
          py: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg,#DBE9FF,#E3D3F7,#F8D9E3)",
        }}
      >
        <Box maxWidth={520}>
          <Typography sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, fontWeight: 700, fontFamily: "Playfair Display" }}>
            DISCOVER YOUR PERFECT FIT
          </Typography>
          <Typography sx={{ mt: 2, fontSize: "1.1rem", color: "#555" }}>
            Virtual try-ons. AI styling. Personalized closets.
          </Typography>
          <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
            <Button variant="contained" sx={{ bgcolor: "#6C5CE7" }} onClick={() => navigate("/tryon")}>
              Try Virtual Fit
            </Button>
            <Button variant="outlined" onClick={() => scrollToSection("features")}>
              Explore More
            </Button>
          </Box>
        </Box>

        <Box
          component="img"
          src={heroImage}
          sx={{ width: 340, display: { xs: "none", md: "block" }, borderRadius: 3 }}
        />
      </Box>

      {/* ================= FEATURES ================= */}
      <Box id="features" sx={{ py: 10 }}>
        <Typography variant="h4" textAlign="center" fontWeight={700} mb={6}>
          WHY CHOOSE VIRTUALFIT?
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {features.map((f, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                sx={{ p: 4, borderRadius: 3, textAlign: "center" }}
              >
                <Box component="img" src={f.icon} sx={{ width: 70, mb: 2 }} />
                <Typography fontWeight={700}>{f.title}</Typography>
                <Typography color="text.secondary" mt={1}>{f.desc}</Typography>
                {hoveredFeature === i && (
                  <Fade in>
                    <Chip label="Explore" sx={{ mt: 2, bgcolor: "#6C5CE7", color: "white" }} />
                  </Fade>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= COLLECTIONS ================= */}
      <Box sx={{ py: 10, bgcolor: "white" }}>
        <Typography variant="h4" textAlign="center" fontWeight={700}>
          Explore Collections
        </Typography>
        <Typography textAlign="center" color="text.secondary" mb={6}>
          Browse curated fashion styles
        </Typography>

        <Grid container spacing={3} justifyContent="center">
          {categories.map((c, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card sx={{ p: 3, bgcolor: c.color, textAlign: "center", borderRadius: 3 }}>
                <Typography fontWeight={700}>{c.name}</Typography>
                <TrendingUpIcon sx={{ mt: 2, color: "#6C5CE7" }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= TESTIMONIALS ================= */}
      <Box sx={{ py: 10 }}>
        <Typography variant="h4" textAlign="center" fontWeight={700} mb={6}>
          What Our Customers Say
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {testimonials.map((t, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ p: 4, borderRadius: 3 }}>
                <Rating value={5} readOnly />
                <Typography mt={2}>"{t.text}"</Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 3, gap: 2 }}>
                  <Avatar sx={{ bgcolor: "#6C5CE7" }}>{t.avatar}</Avatar>
                  <Box>
                    <Typography fontWeight={600}>{t.name}</Typography>
                    <Typography fontSize="0.85rem">{t.role}</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= CTA ================= */}
      <Box sx={{ py: 10, textAlign: "center", background: "linear-gradient(135deg,#6C5CE7,#9D8CE7)", color: "white" }}>
        <Typography variant="h3" fontWeight={700}>
          Ready to Transform Your Wardrobe?
        </Typography>
        <Typography mt={2}>Create your free account and try VirtualFit today</Typography>
        <Button sx={{ mt: 4, bgcolor: "white", color: "#6C5CE7", fontWeight: 700 }} onClick={() => navigate("/signup")}>
          Get Started Free
        </Button>
      </Box>

      {/* ================= FOOTER ================= */}
      <Box sx={{ py: 6, textAlign: "center", bgcolor: "#EDE9FF" }}>
        <Typography fontWeight={600}>© {new Date().getFullYear()} VirtualFit</Typography>
      </Box>

      {/* ================= MOBILE DRAWER ================= */}
      <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <Box sx={{ p: 3, width: 260 }}>
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <CloseIcon />
          </IconButton>
          <Button fullWidth sx={{ mt: 2 }} onClick={() => navigate("/login")}>
            Login
          </Button>
          <Button fullWidth variant="contained" sx={{ mt: 1 }} onClick={() => navigate("/signup")}>
            Sign Up
          </Button>
        </Box>
      </Drawer>

      {/* ================= SNACKBAR ================= */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
