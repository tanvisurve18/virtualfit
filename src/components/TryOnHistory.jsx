import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Sidebar from "./Sidebar";
import { supabase } from "../lib/supabaseClient";

/* ---------------- THEME ---------------- */
const THEME = {
  gradient:
    "linear-gradient(90deg, rgba(219,233,255,1) 0%, rgba(227,211,247,1) 50%, rgba(248,217,227,1) 100%)",
  pageBg: "#F6F7FB",
};

export default function TryOnHistory() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("User");

  /* ---------------- FETCH USER NAME ---------------- */
  async function fetchUserName() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || profile.name || user.email?.split("@")[0] || "User");
      } else {
        setUserName(
          user.user_metadata?.full_name || 
          user.user_metadata?.name || 
          user.email?.split("@")[0] || 
          "User"
        );
      }
    } catch (err) {
      console.error("Error fetching user name:", err);
    }
  }

  /* ---------------- FETCH TRY-ON HISTORY ---------------- */
  async function loadHistory() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tryon_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("History loaded:", data);
      setHistoryItems(data || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- DELETE HISTORY ITEM ---------------- */
  async function deleteHistoryItem(id, imageUrl) {
    try {
      // Extract filename from URL
      const urlParts = imageUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage.from("tryon-images").remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from("tryon_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Refresh history
      loadHistory();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    fetchUserName();
    loadHistory();
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg }}>
      <Sidebar userName={userName} />

      <Box sx={{ ml: { xs: "70px", md: "240px" }, p: 3 }}>
        {/* HEADER */}
        <Box sx={{ p: 3, borderRadius: 3, background: THEME.gradient }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            Try-On History 📸
          </Typography>
          <Typography>View all your virtual try-on captures</Typography>
        </Box>

        {/* CONTENT */}
        <Box sx={{ mt: 4 }}>
          {loading && (
            <Box sx={{ textAlign: "center", mt: 5 }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && historyItems.length === 0 && (
            <Box sx={{ textAlign: "center", mt: 8 }}>
              <Typography
                sx={{
                  fontSize: 48,
                  mb: 2,
                }}
              >
                📷
              </Typography>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "text.secondary",
                  mb: 1,
                }}
              >
                No try-on history yet
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                Start trying on products to see them here!
              </Typography>
            </Box>
          )}

          {!loading && historyItems.length > 0 && (
            <>
              <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 3 }}>
                {historyItems.length} {historyItems.length === 1 ? "Capture" : "Captures"}
              </Typography>

              <Grid container spacing={3}>
                {historyItems.map((item) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                    <Card
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
                      <CardMedia
                        component="img"
                        image={item.image_url}
                        alt={item.item_id}
                        sx={{
                          height: 350,
                          objectFit: "cover",
                          bgcolor: "#f5f5f5",
                        }}
                      />

                      <IconButton
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "rgba(255,255,255,0.95)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,1)",
                            color: "error.main",
                          },
                        }}
                        onClick={() => deleteHistoryItem(item.id, item.image_url)}
                      >
                        <DeleteIcon />
                      </IconButton>

                      <CardContent>
                        <Typography fontSize={15} fontWeight={700} noWrap>
                          {item.item_id}
                        </Typography>
                        <Typography fontSize={13} color="text.secondary">
                          {new Date(item.created_at).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}