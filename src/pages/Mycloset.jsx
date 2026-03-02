import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CompareIcon from "@mui/icons-material/Compare";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RecommendationWidget from '../components/RecommendationWidget';
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { supabase } from "../lib/supabaseClient";
import { hmMenTshirts } from "../data/hmMenTshirts";
import { hmWomenTshirts } from "../data/hmWomenTshirts";

/* ---------------- THEME ---------------- */
const THEME = {
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  pageBg: "#F6F7FB",
  primary: "#6C5CE7"
};

/* ---------------- STATUS TAG CONFIG ---------------- */
const STATUS_CONFIG = {
  tried:      { label: "Tried",        color: "#10b981", bg: "#d1fae5", icon: "🟢" },
  want_to_try:{ label: "Want to Try",  color: "#f59e0b", bg: "#fef3c7", icon: "🟡" },
  favorite:   { label: "Favorite",     color: "#e91e63", bg: "#fce4ec", icon: "❤️" },
  buy_later:  { label: "Buy Later",    color: "#6C5CE7", bg: "#ede9fe", icon: "🛒" }
};

/* ---------------- FILTER PILLS ---------------- */
const FILTERS = [
  { key: "all",          label: "All" },
  { key: "tried",        label: "🟢 Tried" },
  { key: "want_to_try",  label: "🟡 Want to Try" },
  { key: "favorite",     label: "❤️ Favorites" },
  { key: "buy_later",    label: "🛒 Buy Later" },
  { key: "men",          label: "👔 Men" },
  { key: "women",        label: "👗 Women" }
];

/* ================= MY CLOSET ================= */
export default function MyCloset() {
  const navigate = useNavigate();

  // ---- data ----
  const [tryonLooks, setTryonLooks]     = useState([]);   // from tryon_history (is_saved=true)
  const [closetItems, setClosetItems]   = useState([]);   // from closet_items (fav products)
  const [merged, setMerged]             = useState([]);   // unified list shown in grid
  const [filtered, setFiltered]         = useState([]);

  // ---- ui state ----
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading]           = useState(true);
  const [snackbar, setSnackbar]         = useState({ open: false, message: "", severity: "success" });

  // ---- status tag menu ----
  const [tagAnchor, setTagAnchor]       = useState(null);
  const [tagItemId, setTagItemId]       = useState(null);

  // ---- compare ----
  const [compareList, setCompareList]   = useState([]);   // max 2 ids
  const [compareOpen, setCompareOpen]   = useState(false);

  // ---- full-image viewer ----
  const [viewImage, setViewImage]       = useState(null);

  // ---- delete confirm ----
  const [deleteId, setDeleteId]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  /* ─── initial load ─── */
  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      // 1. saved try-on looks
      const { data: looks } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_saved", true)
        .order("created_at", { ascending: false });

      // 2. favourited products (closet_items table)
      const { data: favs } = await supabase
        .from("closet_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setTryonLooks(looks || []);
      setClosetItems(favs  || []);
    } catch (err) {
      console.error("MyCloset fetch error:", err);
      setSnackbar({ open: true, message: "Failed to load closet", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  /* ─── merge + normalise into one list ─── */
  useEffect(() => {
    // Normalise saved try-on looks
    const fromTryon = (tryonLooks || []).map(item => ({
      id:           "tryon_" + item.id,
      _raw_id:      item.id,
      type:         "tryon",                        // saved try-on
      tryonImage:   item.image_data,                // the composite screenshot
      productImage: item.product_image,
      productName:  item.product_name,
      price:        item.product_price,
      category:     guessCategory(item.product_name, item.product_id),
      dateSaved:    item.created_at,
      status:       item.status || "tried",         // default tag for saved try-ons
      productUrl:   null                            // not stored in tryon_history
    }));

    // Normalise favourite products (no try-on yet)
    const fromCloset = (closetItems || []).map(item => ({
      id:           "closet_" + item.id,
      _raw_id:      item.id,
      type:         "favorite",                     // product saved without try-on
      tryonImage:   null,
      productImage: item.product_image,
      productName:  item.product_name,
      price:        item.product_price,
      category:     item.category || "men",
      dateSaved:    item.created_at,
      status:       item.status || "favorite",
      productUrl:   item.product_url
    }));

    setMerged([...fromTryon, ...fromCloset]);
  }, [tryonLooks, closetItems]);

  /* ─── apply active filter ─── */
  useEffect(() => {
    if (activeFilter === "all") {
      setFiltered(merged);
    } else if (activeFilter === "men" || activeFilter === "women") {
      setFiltered(merged.filter(i => i.category === activeFilter));
    } else {
      setFiltered(merged.filter(i => i.status === activeFilter));
    }
  }, [activeFilter, merged]);

  /* ─── guess category from product data arrays ─── */
  function guessCategory(name, productId) {
    const menIds  = hmMenTshirts.map(p => String(p.id));
    const womenIds= hmWomenTshirts.map(p => String(p.id));
    if (menIds.includes(String(productId)))   return "men";
    if (womenIds.includes(String(productId))) return "women";
    // fallback: check title keywords
    if (name && /women|girl|dress|top|skirt/i.test(name)) return "women";
    return "men";
  }

  /* ─── update status tag ─── */
  async function updateStatus(item, newStatus) {
    setTagAnchor(null);
    try {
      if (item.type === "tryon") {
        await supabase.from("tryon_history").update({ status: newStatus }).eq("id", item._raw_id);
        setTryonLooks(prev => prev.map(r => r.id === item._raw_id ? { ...r, status: newStatus } : r));
      } else {
        await supabase.from("closet_items").update({ status: newStatus }).eq("id", item._raw_id);
        setClosetItems(prev => prev.map(r => r.id === item._raw_id ? { ...r, status: newStatus } : r));
      }
      setSnackbar({ open: true, message: `Tagged as "${STATUS_CONFIG[newStatus].label}"`, severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to update tag", severity: "error" });
    }
  }

  /* ─── delete item ─── */
  async function confirmDelete() {
    setDeleteConfirm(false);
    if (!deleteId) return;
    try {
      const item = merged.find(i => i.id === deleteId);
      if (!item) return;
      if (item.type === "tryon") {
        await supabase.from("tryon_history").delete().eq("id", item._raw_id);
        setTryonLooks(prev => prev.filter(r => r.id !== item._raw_id));
      } else {
        await supabase.from("closet_items").delete().eq("id", item._raw_id);
        setClosetItems(prev => prev.filter(r => r.id !== item._raw_id));
      }
      setSnackbar({ open: true, message: "Removed from closet", severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to delete", severity: "error" });
    } finally {
      setDeleteId(null);
    }
  }

  /* ─── download image ─── */
  function handleDownload(item) {
    const src = item.tryonImage || item.productImage;
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = `closet_${item.productName.replace(/\s+/g, "_")}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* ─── compare toggle ─── */
  function toggleCompare(id) {
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) {
        setSnackbar({ open: true, message: "You can compare up to 2 items", severity: "warning" });
        return prev;
      }
      return [...prev, id];
    });
  }

  /* ─── render helpers ─── */
  function renderStatusTag(status) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.favorite;
    return (
      <Chip
        label={`${cfg.icon} ${cfg.label}`}
        size="small"
        sx={{
          bgcolor: cfg.bg,
          color: cfg.color,
          fontWeight: 700,
          fontSize: 11,
          height: 24,
          border: "none"
        }}
      />
    );
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ─── skeleton card (loading) ─── */
  function SkeletonCard() {
    return (
      <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Skeleton variant="rectangular" height={200} />
        <CardContent sx={{ p: 2 }}>
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
          <Skeleton variant="rectangular" width={60} height={24} sx={{ mt: 1, borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  /* ─── single closet card ─── */
  function ClosetCard({ item }) {
    const isComparing = compareList.includes(item.id);
    const mainImage   = item.tryonImage || item.productImage;

    return (
      <Card
        elevation={2}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
          border: isComparing ? `2px solid ${THEME.primary}` : "1px solid #e8e8e8",
          transition: "all 0.25s",
          "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }
        }}
      >
        {/* compare checkbox – top-left */}
        <IconButton
          size="small"
          onClick={() => toggleCompare(item.id)}
          sx={{
            position: "absolute", top: 6, left: 6, zIndex: 2,
            bgcolor: "rgba(255,255,255,0.88)", p: 0.3,
            "&:hover": { bgcolor: "white" }
          }}
        >
          {isComparing
            ? <CheckCircleIcon sx={{ color: THEME.primary, fontSize: 20 }} />
            : <RadioButtonUncheckedIcon sx={{ color: "#999", fontSize: 20 }} />
          }
        </IconButton>

        {/* more-menu – top-right */}
        <IconButton
          size="small"
          onClick={(e) => { setTagAnchor(e.currentTarget); setTagItemId(item.id); }}
          sx={{
            position: "absolute", top: 6, right: 6, zIndex: 2,
            bgcolor: "rgba(255,255,255,0.88)", p: 0.3,
            "&:hover": { bgcolor: "white" }
          }}
        >
          <MoreVertIcon sx={{ fontSize: 18, color: "#555" }} />
        </IconButton>

        {/* main image */}
        <Box
          onClick={() => setViewImage(mainImage)}
          sx={{
            height: 200,
            bgcolor: "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", position: "relative", overflow: "hidden"
          }}
        >
          {mainImage ? (
            <img
              src={mainImage}
              alt={item.productName}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          ) : (
            <Typography color="text.disabled" fontSize={13}>No image</Typography>
          )}

          {/* type badge */}
          <Chip
            label={item.type === "tryon" ? "✨ Try-On" : "❤️ Saved"}
            size="small"
            sx={{
              position: "absolute", bottom: 8, left: 8,
              bgcolor: item.type === "tryon" ? "rgba(108,92,231,0.85)" : "rgba(233,30,99,0.85)",
              color: "white", fontWeight: 700, fontSize: 11
            }}
          />
        </Box>

        {/* info */}
        <CardContent sx={{ p: 2, pb: 1.5 }}>
          <Typography fontSize={13} fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
          }}>
            {item.productName}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
            <Typography fontSize={15} fontWeight={800} color={THEME.primary}>
              {item.price}
            </Typography>
            <Typography fontSize={11} color="text.secondary">
              {item.category === "men" ? "👔 Men" : "👗 Women"}
            </Typography>
          </Box>

          {/* status tag */}
          <Box sx={{ mt: 1 }}>
            {renderStatusTag(item.status)}
          </Box>

          {/* date */}
          {item.dateSaved && (
            <Typography fontSize={10.5} color="text.disabled" sx={{ mt: 0.5 }}>
              Saved {formatDate(item.dateSaved)}
            </Typography>
          )}

          {/* Try On button */}
          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate("/tryon", {
              state: {
                garment_image: item.productImage,
                product_name: item.productName,
                product_price: item.price,
                product_url: item.productUrl,
                product_id: item._raw_id
              }
            })}
            sx={{
              fontWeight: 700,
              bgcolor: THEME.primary,
              fontSize: 13,
              py: 1.2,
              borderRadius: 2,
              textTransform: "none",
              mt: 1.2,
              boxShadow: "0 4px 12px rgba(108, 92, 231, 0.3)",
              "&:hover": {
                bgcolor: "#5a4bc7",
                boxShadow: "0 6px 16px rgba(108, 92, 231, 0.4)",
              }
            }}
          >
            Try On
          </Button>

          {/* action buttons row */}
          <Box sx={{ display: "flex", gap: 0.7, mt: 0.8, flexWrap: "wrap" }}>
            <IconButton size="small" onClick={() => handleDownload(item)}
              title="Download"
              sx={{ p: 0.6, border: "1px solid #e0e0e0", borderRadius: 1.5, "&:hover": { bgcolor: "#f5f5f5" } }}>
              <DownloadIcon sx={{ fontSize: 16, color: "#555" }} />
            </IconButton>

            {item.productUrl && (
              <IconButton size="small" onClick={() => window.open(item.productUrl, "_blank")}
                title="Buy on H&M"
                sx={{ p: 0.6, border: "1px solid #e0e0e0", borderRadius: 1.5, "&:hover": { bgcolor: "#f5f5f5" } }}>
                <OpenInNewIcon sx={{ fontSize: 16, color: "#555" }} />
              </IconButton>
            )}

            <IconButton size="small"
              onClick={() => { setDeleteId(item.id); setDeleteConfirm(true); }}
              title="Remove"
              sx={{ p: 0.6, border: "1px solid #ffcdd2", borderRadius: 1.5, "&:hover": { bgcolor: "#ffebee" } }}>
              <DeleteIcon sx={{ fontSize: 16, color: "#d32f2f" }} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  }

  /* ─── compare panel ─── */
  function ComparePanel() {
    if (compareList.length < 2) return null;
    const [a, b] = compareList.map(id => merged.find(i => i.id === id));
    if (!a || !b) return null;

    const rows = [
      { label: "Image",    valA: a.tryonImage || a.productImage, valB: b.tryonImage || b.productImage, isImg: true },
      { label: "Name",     valA: a.productName,  valB: b.productName },
      { label: "Price",    valA: a.price,        valB: b.price },
      { label: "Category", valA: a.category === "men" ? "👔 Men" : "👗 Women", valB: b.category === "men" ? "👔 Men" : "👗 Women" },
      { label: "Status",   valA: a.status,       valB: b.status,       isTag: true },
      { label: "Saved",    valA: formatDate(a.dateSaved), valB: formatDate(b.dateSaved) }
    ];

    return (
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18 }}>
          Compare Items
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: "1px", bgcolor: "#e0e0e0", borderRadius: 2, overflow: "hidden" }}>
            {/* header */}
            {["", "Item 1", "Item 2"].map((h, i) => (
              <Box key={i} sx={{ bgcolor: THEME.primary, color: "white", p: 1.5, textAlign: "center", fontWeight: 700, fontSize: 13 }}>
                {h}
              </Box>
            ))}

            {rows.map((row, i) => (
              <React.Fragment key={i}>
                {/* label col */}
                <Box sx={{ bgcolor: "#f5f5f5", p: 1.5, display: "flex", alignItems: "center", fontWeight: 700, fontSize: 12, color: "#555" }}>
                  {row.label}
                </Box>
                {/* value A */}
                <Box sx={{ bgcolor: "white", p: 1.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {row.isImg
                    ? <img src={row.valA} alt="" style={{ maxHeight: 120, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }} />
                    : row.isTag
                      ? renderStatusTag(row.valA)
                      : <Typography fontSize={13}>{row.valA}</Typography>
                  }
                </Box>
                {/* value B */}
                <Box sx={{ bgcolor: "white", p: 1.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {row.isImg
                    ? <img src={row.valB} alt="" style={{ maxHeight: 120, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }} />
                    : row.isTag
                      ? renderStatusTag(row.valB)
                      : <Typography fontSize={13}>{row.valB}</Typography>
                  }
                </Box>
              </React.Fragment>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setCompareOpen(false)} sx={{ color: THEME.primary, fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <Box sx={{ minHeight: "100vh", background: THEME.pageBg, pb: 6 }}>

      {/* ── HEADER ── */}
      <Box sx={{ background: THEME.gradient, color: "white", py: 2, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/dashboard")} sx={{ color: "white" }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>👗 My Closet</Typography>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, mt: 3 }}>

        {/* ── STATS ROW ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 2, mb: 3 }}>
          {[
            { label: "Total Items",  value: merged.length,                                            color: THEME.primary },
            { label: "Try-On Looks", value: merged.filter(i => i.type === "tryon").length,            color: "#10b981" },
            { label: "Favorites",    value: merged.filter(i => i.type === "favorite").length,         color: "#e91e63" },
            { label: "Buy Later",    value: merged.filter(i => i.status === "buy_later").length,      color: "#f59e0b" }
          ].map((s, idx) => (
            <Card key={idx} elevation={2} sx={{ borderRadius: 2.5, p: 1.8, textAlign: "center" }}>
              <Typography fontSize={22} fontWeight={800} color={s.color}>{s.value}</Typography>
              <Typography fontSize={11} color="text.secondary" fontWeight={600}>{s.label}</Typography>
            </Card>
          ))}
        </Box>

        {/* ── FILTER PILLS + COMPARE BUTTON ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 3 }}>
          {FILTERS.map(f => (
            <Chip
              key={f.key}
              label={f.label}
              onClick={() => setActiveFilter(f.key)}
              sx={{
                fontWeight: 600, fontSize: 12, height: 32,
                bgcolor: activeFilter === f.key ? THEME.primary : "white",
                color:   activeFilter === f.key ? "white"        : "#555",
                border:  activeFilter === f.key ? "none"         : "1px solid #ddd",
                "&:hover": { bgcolor: activeFilter === f.key ? "#5a4bc7" : "#f0f0f0" }
              }}
            />
          ))}

          {/* compare trigger */}
          {compareList.length === 2 && (
            <Button
              variant="contained"
              size="small"
              startIcon={<CompareIcon />}
              onClick={() => setCompareOpen(true)}
              sx={{ ml: "auto", bgcolor: THEME.primary, fontWeight: 700, height: 32, "&:hover": { bgcolor: "#5a4bc7" } }}
            >
              Compare
            </Button>
          )}
        </Box>

        {/* ── GRID ── */}
        {loading ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2.5 }}>
            {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}
          </Box>
        ) : filtered.length === 0 ? (
          /* empty state */
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography fontSize={48}>👗</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
              {activeFilter === "all" ? "Your closet is empty" : `No "${FILTERS.find(f => f.key === activeFilter)?.label}" items yet`}
            </Typography>
            <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.8, maxWidth: 380, mx: "auto" }}>
              {activeFilter === "all"
                ? "Save try-on looks or favorite products to see them here."
                : "Try a different filter or add more items to your closet."}
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2.5, bgcolor: THEME.primary, fontWeight: 600, "&:hover": { bgcolor: "#5a4bc7" } }}
              onClick={() => navigate("/dashboard")}
            >
              Browse Products
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2.5 }}>
            {filtered.map(item => <ClosetCard key={item.id} item={item} />)}
          </Box>
        )}
      </Box>

      {/* ── STATUS TAG MENU ── */}
      <Menu
        anchorEl={tagAnchor}
        open={Boolean(tagAnchor)}
        onClose={() => setTagAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } }}
      >
        <Typography sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 11, color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>
          Status Tag
        </Typography>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const currentItem = merged.find(i => i.id === tagItemId);
          const isActive = currentItem?.status === key;
          return (
            <MenuItem
              key={key}
              onClick={() => { if (currentItem) updateStatus(currentItem, key); }}
              selected={isActive}
              sx={{ px: 2, py: 0.8, "&.Mui-selected": { bgcolor: `${cfg.bg}` } }}
            >
              <ListItemIcon sx={{ minWidth: 28, fontSize: 16 }}>{cfg.icon}</ListItemIcon>
              <ListItemText primary={cfg.label} primaryTypographyProps={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }} />
              {isActive && <CheckCircleIcon sx={{ fontSize: 16, color: cfg.color }} />}
            </MenuItem>
          );
        })}

        {/* divider + extra actions */}
        <Box sx={{ borderTop: "1px solid #eee", mt: 0.5, pt: 0.5 }}>
          {(() => {
            const currentItem = merged.find(i => i.id === tagItemId);
            return currentItem ? (
              <>
                <MenuItem onClick={() => { setViewImage(currentItem.tryonImage || currentItem.productImage); setTagAnchor(null); }} sx={{ px: 2, py: 0.8 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><OpenInNewIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                  <ListItemText primary="View Full Image" primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
                <MenuItem onClick={() => { handleDownload(currentItem); setTagAnchor(null); }} sx={{ px: 2, py: 0.8 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><DownloadIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                  <ListItemText primary="Download" primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
                <MenuItem onClick={() => { setDeleteId(currentItem.id); setDeleteConfirm(true); setTagAnchor(null); }} sx={{ px: 2, py: 0.8, color: "#d32f2f" }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><DeleteIcon sx={{ fontSize: 16, color: "#d32f2f" }} /></ListItemIcon>
                  <ListItemText primary="Remove from Closet" primaryTypographyProps={{ fontSize: 13, color: "#d32f2f" }} />
                </MenuItem>
              </>
            ) : null;
          })()}
        </Box>
      </Menu>

      {/* ── FULL IMAGE VIEWER ── */}
      <Dialog open={Boolean(viewImage)} onClose={() => setViewImage(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 1, display: "flex", justifyContent: "center", bgcolor: "#111", borderRadius: 2 }}>
          {viewImage && <img src={viewImage} alt="Full view" style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewImage(null)} sx={{ color: THEME.primary, fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <Dialog open={deleteConfirm} onClose={() => { setDeleteConfirm(false); setDeleteId(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Remove Item</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">This will permanently remove this item from your closet. This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => { setDeleteConfirm(false); setDeleteId(null); }} sx={{ color: "#555", fontWeight: 600 }}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" sx={{ bgcolor: "#d32f2f", fontWeight: 700, "&:hover": { bgcolor: "#b71c1c" } }}>Remove</Button>
        </DialogActions>
      </Dialog>

      {/* ── COMPARE PANEL ── */}
      <ComparePanel />
      <RecommendationWidget
        type="closet-based"
        savedLooks={tryonLooks}
        closetItems={closetItems}
        count={6}
      />

      {/* ── SNACKBAR ── */}
      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%", fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, mt: 4, mb: 4 }}>
        <RecommendationWidget
          type="closet-based"
          savedLooks={tryonLooks}
          closetItems={closetItems}
          title="You Might Also Like"
          count={6}
        />
      </Box>
    </Box>
    
  );
}