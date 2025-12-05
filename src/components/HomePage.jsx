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
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  InputBase,
  Paper,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import heroImage from "../assets/hero-models.png";
import IconTryOn from "../assets/features/virtual-tryon.png";
import IconSmartAI from "../assets/features/smart-fit.png";
import IconCloset from "../assets/features/personal-closet.png";


export default function HomePage() {
  const navigate = useNavigate();

  // Popover state for "Categories"
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleOpenCategories = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseCategories = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  const id = open ? "categories-popover" : undefined;

  // Category data (you can update/extend later)
  const categories = [
    {
      id: "tops",
      title: "Tops & Shirts",
      desc: "Tees & shirts — casual to formal.",
      icon: "👚",
    },
    {
      id: "dresses",
      title: "Dresses",
      desc: "Everyday, party & formal dresses.",
      icon: "👗",
    },
    {
      id: "bottoms",
      title: "Bottoms",
      desc: "Jeans, trousers, skirts & shorts.",
      icon: "👖",
    },
    {
      id: "outerwear",
      title: "Outerwear",
      desc: "Jackets, coats & blazers.",
      icon: "🧥",
    },
    
  ];

  return (
    <Box sx={{ width: "100%", bgcolor: "#F6F7FB", overflowX: "hidden" }}>
      {/* ================= NAVBAR ================= */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(12px)",
          py: 0,
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2, minHeight: "56px"}}>
          {/* Left: brand + mobile menu icon */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton
              edge="start"
              aria-label="open menu"
              sx={{ display: { xs: "inline-flex", md: "none" } }}
            >
              <MenuIcon sx={{ color: "#2B2345" }} />
            </IconButton>

            <Typography
              sx={{
                fontSize: "1.6rem",
                fontFamily: "Playfair Display, serif",
                fontWeight: 700,
                color: "#2B2345",
                cursor: "pointer",
              }}
              onClick={() => navigate("/")}
            >
              VirtualFit
            </Typography>

            {/* Categories button (popover) */}
            <Button
              aria-describedby={id}
              onClick={handleOpenCategories}
              endIcon={<ExpandMoreIcon />}
              sx={{
                display: { xs: "none", md: "inline-flex" },
                color: "#2B2345",
                textTransform: "none",
                fontWeight: 600,
                ml: 2,
                bgcolor: open ? "rgba(123,75,255,0.08)" : "transparent",
                ":hover": { bgcolor: "rgba(123,75,255,0.08)" },
              }}
            >
              Categories
            </Button>
          </Box>

          {/* Center: search (hidden on xs) */}
          <Paper
            component="form"
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              width: 420,
              px: 1,
              py: 0.5,
              borderRadius: 3,
              boxShadow: "none",
              border: "1px solid rgba(43,35,69,0.06)",
              bgcolor: "rgba(255,255,255,0.7)",
            }}
            onSubmit={(e) => {
              e.preventDefault();
              // placeholder: integrate search behavior later
            }}
          >
            <IconButton type="submit" sx={{ p: "10px" }} aria-label="search">
              <SearchIcon sx={{ color: "#7B4BFF" }} />
            </IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Search styles, brands, outfits..."
              inputProps={{ "aria-label": "search styles" }}
            />
          </Paper>

          {/* Right: nav actions */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              sx={{ color: "#2B2345", display: { xs: "none", md: "inline-flex" } }}
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            <Button
              variant="contained"
              sx={{
                px: 2.5,
                py: 0.8,
                borderRadius: "10px",
                background: "#7B4BFF",
                fontWeight: 700,
                ":hover": { background: "#6C3EE3" },
              }}
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ========== CATEGORIES POPOVER (Modern Floating Card) ========== */}
      <Popover
  id={id}
  open={open}
  anchorEl={anchorEl}
  onClose={handleCloseCategories}
  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
  transformOrigin={{ vertical: "top", horizontal: "left" }}
  PaperProps={{
    sx: {
      width: 260,                      // Smaller width
      borderRadius: "14px",
      boxShadow: "0px 10px 30px rgba(0,0,0,0.08)",
      p: 1.5,
      mt: 1,
    },
  }}
>
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    {categories.map((cat) => (
      <Box
        key={cat.id}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          p: "10px 12px",               // Even spacing
          borderRadius: "10px",
          transition: "0.2s",
          cursor: "pointer",
          "&:hover": {
            backgroundColor: "rgba(123,75,255,0.08)",
          },
        }}
      >
        <Box
          sx={{
            fontSize: "1.3rem",         // Smaller icon
            mt: "2px",
          }}
        >
          {cat.icon}
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "#2B2345" }}>
            {cat.title}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "#666", mt: "3px" }}>
            {cat.desc}
          </Typography>
        </Box>
      </Box>
    ))}
  </Box>
</Popover>


      {/* ================= HERO SECTION ================= */}
      <Box
        sx={{
          width: "100%",
          minHeight: "48vh",                // ↓ smaller hero (was 60vh)
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 3, md: 8 },             // ↓ smaller padding
          py: { xs: 4, md: 4 },             // ↓ smaller padding
          background:
            "linear-gradient(135deg, #dbe9ff 0%, #e3d3f7 50%, #f8d9e3 100%)",
        }}
      >

        {/* LEFT TEXT */}
        <Box sx={{ maxWidth: { xs: "100%", md: "480px" } }}>
          <Typography
            sx={{
              fontSize: { xs: "1.6rem", md: "2.4rem" },
              fontWeight: "700",
              color: "#2B2345",
              lineHeight: "1.05",
              fontFamily: "Playfair Display, serif",
            }}
          >
            DISCOVER <br /> YOUR <br /> PERFECT FIT
          </Typography>

          <Typography
            sx={{
              fontSize: "0.95rem",
              color: "#444",
              mt: 2,
              maxWidth: { xs: "100%", md: "380px" },
            }}
          >
            Virtual try-ons. AI styling. Personalized closets — redefine the way
            you shop fashion.
          </Typography>

          {/* BUTTONS */}
          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              sx={{
                px: 4,
                py: 1.2,
                borderRadius: "10px",
                background: "#7B4BFF",
                fontSize: "1rem",
                ":hover": { background: "#6C3EE3" },
              }}
              onClick={() => navigate("/tryon")}
            >
              SHOP NOW
            </Button>

            <Button
              variant="outlined"
              sx={{
                px: 4,
                py: 1.2,
                borderRadius: "10px",
                borderColor: "#7B4BFF",
                color: "#7B4BFF",
                fontSize: "1rem",
                ":hover": { borderColor: "#6C3EE3", color: "#6C3EE3" },
              }}
              onClick={() => {
                // smooth scroll to features
                const el = document.querySelector("#features");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              EXPLORE MORE
            </Button>
          </Box>
        </Box>

        {/* RIGHT FLOATING IMAGE */}
        <Box
          sx={{
            width: 360,
            height: 520,
            display: { xs: "none", md: "flex" },
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            p: 1.5,   // inner padding for border effect

            // small float animation
            animation: "floatUpDown 5s ease-in-out infinite",
            "@keyframes floatUpDown": {
              "0%": { transform: "translateY(0px)" },
              "50%": { transform: "translateY(-10px)" },
              "100%": { transform: "translateY(0px)" },
            },
          }}
        >
          <Box
            component="img"
            src={heroImage}
            alt="VirtualFit Models"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "24px",
            }}
          />
        </Box>

      </Box>

      {/* ================== FEATURES SECTION ================== */}
      <Box id="features" sx={{ textAlign: "center", py: 10 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "700",
            color: "#2B2345",
            fontFamily: "Playfair Display, serif",
            mb: 6,
          }}
        >
          WHY CHOOSE VIRTUALFIT?
        </Typography>

        <Grid container spacing={4} justifyContent="center" sx={{ px: { xs: 2, md: 6 } }}>
          {[
            {
              icon: IconTryOn,
              title: "Virtual Try-On",
              desc: "See clothes on your body instantly.",
            },
            {
              icon: IconSmartAI,
              title: "Smart Fit AI",
              desc: "AI suggests perfect outfits for your body.",
            },
            {
              icon: IconCloset,
              title: "Personal Closet",
              desc: "Save your favorite outfits & combinations.",
            },
          ].map((item, idx) => (
            <Grid item xs={12} md={3} key={idx}>
              <Card
                sx={{
                  padding: 3,
                  textAlign: "center",
                  borderRadius: "18px",
                  boxShadow: "0px 10px 20px rgba(0,0,0,0.06)",
                  background: "#FFFFFF",
                  transition: "transform .25s ease, box-shadow .25s ease",
                  ":hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0px 18px 30px rgba(43,35,69,0.08)",
                  },
                }}
              >
                <CardContent>
                  <Box
                    component="img"
                    src={item.icon}
                    alt={item.title}
                    sx={{
                      width: 80,
                      height: 80,
                      objectFit: "contain",
                      mx: "auto",
                      mb: 2,
                    }}
                  />
                  <Typography sx={{ fontWeight: "700", mb: 1, fontSize: "1.1rem" }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: "#666" }}>{item.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>


      {/* ================== HOW IT WORKS ================== */}
      <Box
        sx={{
          py: 10,
          px: 4,
          textAlign: "center",
          background: "linear-gradient(135deg, #e3dfff, #f7e4ef)",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "700",
            color: "#2B2345",
            fontFamily: "Playfair Display, serif",
            mb: 6,
          }}
        >
          HOW IT WORKS
        </Typography>

        <Grid container spacing={6} justifyContent="center" sx={{ px: { xs: 2, md: 6 } }}>
          {[
            {
              num: "1",
              title: "Upload Your Photo",
              desc: "Use a clear picture to generate your virtual avatar.",
            },
            {
              num: "2",
              title: "Try Outfits Instantly",
              desc: "AI fits clothes on your avatar for accurate look.",
            },
            {
              num: "3",
              title: "Shop Confidently",
              desc: "Choose the best size, style, and fit.",
            },
          ].map((step, idx) => (
            <Grid item xs={12} md={3} key={idx}>
              <Typography
                sx={{
                  fontSize: "3rem",
                  color: "#7543D8",
                  fontWeight: "700",
                }}
              >
                {step.num}
              </Typography>
              <Typography variant="h6" sx={{ mt: 2, fontWeight: "600" }}>
                {step.title}
              </Typography>
              <Typography sx={{ mt: 1, color: "#555" }}>{step.desc}</Typography>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ================= FOOTER ================= */}
      <Box sx={{ textAlign: "center", py: 1, bgcolor: "#EDE9FF", mt: 0}}>
        

        <Typography sx={{ color: "#2B2345", fontWeight: 600, mt: 0 }}>
          © {new Date().getFullYear()} VirtualFit · All Rights Reserved
        </Typography>
      </Box>
    </Box>
  );
}
