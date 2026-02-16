// src/Components/PipelineStage.jsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { Droppable, Draggable } from "react-beautiful-dnd";

// Helper to get owner name
function getOwnerName(deal) {
  if (deal.accountManager && deal.accountManager.trim())
    return deal.accountManager.trim();
  if (deal.assignedTo && typeof deal.assignedTo === "object") {
    const { firstName = "", lastName = "", username = "" } = deal.assignedTo;
    const full = (firstName + " " + lastName).trim();
    if (full) return full;
    if (username) return username;
  }
  if (deal.salespersonId && typeof deal.salespersonId === "object") {
    const { firstName = "", lastName = "", username = "" } = deal.salespersonId;
    const full = (firstName + " " + lastName).trim();
    if (full) return full;
    if (username) return username;
  }
  return "Owner N/A";
}

const DEFAULT_ROWS_SHOWN = 4;

function PipelineStage({
  title,
  deals = [],
  onEditDeal = () => {},
  onSelectOpportunity = () => {},
}) {
  const processedDeals = Array.isArray(deals)
    ? deals.filter((deal) => deal?.stage === title)
    : [];

  const [expanded, setExpanded] = useState(false);

  // --- NEW LOGIC START (Using LocalStorage) ---
  const lastViewedId = localStorage.getItem("lastViewedDealId"); // Switched to localStorage

  useEffect(() => {
    if (!lastViewedId) return;

    // 1. Check if the target deal is in THIS stage
    const dealIndex = processedDeals.findIndex((d) => d._id === lastViewedId);

    if (dealIndex !== -1) {
      // 2. If it's hidden (index > 4), auto-expand the list
      if (dealIndex >= DEFAULT_ROWS_SHOWN) {
        setExpanded(true);
      }

      // 3. Scroll to it after a short delay (to allow render)
      setTimeout(() => {
        const element = document.getElementById(`deal-card-${lastViewedId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [lastViewedId, deals]); // Updated dependency to 'deals' for reliable triggering
  // --- NEW LOGIC END ---

  const visibleDeals = expanded
    ? processedDeals
    : processedDeals.slice(0, DEFAULT_ROWS_SHOWN);

  return (
    <Droppable droppableId={title}>
      {(provided) => (
        <Box
          ref={provided.innerRef}
          {...provided.droppableProps}
          minHeight={100}
          p={1}
        >
          {visibleDeals.length === 0 && (
            <Typography
              color="text.secondary"
              variant="body2"
              align="center"
              sx={{ mt: 1 }}
            >
              No deals
            </Typography>
          )}

          {visibleDeals.map((deal, index) => {
            const isHighlighted = deal._id === lastViewedId;

            return (
              <Draggable draggableId={deal._id} index={index} key={deal._id}>
                {(provided, snapshot) => (
                  <Card
                    id={`deal-card-${deal._id}`} // Add ID for scrolling
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    sx={{
                      mt: 1,
                      mb: 0.5,
                      cursor: "pointer",
                      borderRadius: 1.5,
                      transition: "all 0.3s ease",
                      // --- VISUAL HIGHLIGHT STYLES ---
                      boxShadow: isHighlighted ? 6 : 1,
                      backgroundColor: isHighlighted ? "#e3f2fd" : "#fff", // Light blue background if viewed
                      border: isHighlighted
                        ? "2px solid #1976d2"
                        : "1px solid transparent", // Blue border
                      borderLeft: isHighlighted
                        ? "4px solid #1565c0"
                        : "4px solid #b0bec5",
                      // -------------------------------
                      "&:hover": {
                        boxShadow: 4,
                        backgroundColor: "#e7f3ff",
                        border: "1px solid #1976d2",
                      },
                      minHeight: 70,
                      px: 1,
                    }}
                    onClick={() =>
                      onSelectOpportunity && onSelectOpportunity(deal._id)
                    }
                  >
                    <CardContent sx={{ pt: 1.5, pb: "8px!important" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {deal.customer || "No Name"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {deal.type || "-"}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                      >
                        <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        {getOwnerName(deal)}
                      </Typography>
                      {title === "Qualified" && deal.quotationStatus && (
                        <Chip
                          label={`Quote: ${deal.quotationStatus}`}
                          size="small"
                          color={
                            deal.quotationStatus === "Approved"
                              ? "success"
                              : deal.quotationStatus === "Rejected"
                              ? "error"
                              : "warning"
                          }
                          sx={{ mt: 1, fontWeight: "bold" }}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
              </Draggable>
            );
          })}

          {processedDeals.length > DEFAULT_ROWS_SHOWN && (
            <Box mt={1} display="flex" justifyContent="center">
              <Button
                variant="text"
                size="small"
                onClick={() => setExpanded((exp) => !exp)}
              >
                {!expanded
                  ? `More Opportunities (${
                      processedDeals.length - DEFAULT_ROWS_SHOWN
                    } more)`
                  : "Show Less"}
              </Button>
            </Box>
          )}

          {provided.placeholder}
        </Box>
      )}
    </Droppable>
  );
}

export default PipelineStage;
