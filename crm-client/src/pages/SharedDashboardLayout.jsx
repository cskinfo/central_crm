import { Box, Typography, Chip, Paper } from "@mui/material";
import { DragDropContext } from "react-beautiful-dnd";
import PipelineStage from "../Components/PipelineStage";

function SharedDashboardLayout({
  title = "",
  userRole = "",
  deals = [],
  loading = false,
  onDragEnd = () => {},
  onEditDeal = () => {},
  onSelectOpportunity = () => {},
}) {
  const stages = ["New", "Qualified", "Proposition", "Won"];

  const getStageRevenue = (stage) => {
    return deals
      .filter((deal) => deal.stage === stage)
      .reduce((sum, deal) => sum + (deal.expectedRevenue || 0), 0);
  };
  const getStageCount = (stage) =>
    deals.filter((deal) => deal.stage === stage).length;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header Area */}
      <Box mb={1.5} display="flex" alignItems="center" gap={2} flexShrink={0}>
        <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
          {title}
        </Typography>
      </Box>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* COMPACT HORIZONTAL SCROLL CONTAINER */}
        <Box
          display="flex"
          gap={1.5}
          sx={{
            flexGrow: 1, // Fill remaining vertical space
            overflowX: "auto", // Allow horizontal scroll if columns don't fit
            overflowY: "hidden", // Prevent page-level vertical scroll
            pb: 1,
            // Custom Scrollbar styling
            "&::-webkit-scrollbar": { height: 8 },
            "&::-webkit-scrollbar-thumb": {
              background: "#ccc",
              borderRadius: 4,
            },
          }}
        >
          {stages.map((stage) => (
            <Paper
              key={stage}
              elevation={0}
              sx={{
                minWidth: "260px",
                flex: 1, // Distribute width equally
                background: "#f4f5f7",
                borderRadius: 1.5,
                border: "1px solid #e0e0e0",
                display: "flex",
                flexDirection: "column",
                maxHeight: "100%", // Vital for internal scrolling
              }}
            >
              {/* Sticky Header */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                px={1.5}
                py={1}
                borderBottom="1px solid #ebebeb"
                bgcolor="#fff"
                borderRadius="6px 6px 0 0"
                flexShrink={0} // Prevent header from shrinking
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    textTransform="uppercase"
                  >
                    {stage}
                  </Typography>
                  <Chip
                    label={getStageCount(stage)}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: "#edf2fa",
                      color: "#1a237e",
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
                  ₹{getStageRevenue(stage).toLocaleString()}
                </Typography>
              </Box>

              {/* Scrollable Content Area */}
              <Box
                p={1}
                flexGrow={1}
                sx={{
                  overflowY: "auto", // SCROLLBAR APPEARS HERE
                  minHeight: 0, // Flexbox fix for scrolling
                  // Thin scrollbar for the column
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#d1d5db",
                    borderRadius: 4,
                  },
                }}
              >
                <PipelineStage
                  title={stage}
                  deals={deals}
                  onEditDeal={onEditDeal}
                  onSelectOpportunity={onSelectOpportunity}
                />
              </Box>
            </Paper>
          ))}
        </Box>
      </DragDropContext>
    </Box>
  );
}

export default SharedDashboardLayout;
