import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
  Chip,
} from "@mui/material";
import {
  Add,
  Delete,
  Save,
  ArrowBack,
  Edit as EditIcon,
  CloudUpload,
  Visibility,
  History,
} from "@mui/icons-material";
import axios from "axios";
import { toast } from "react-toastify";
import { getAuthHeader } from "./Auth";

function ProjectCostSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // File Upload State
  const [poFile, setPoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);

  // Data States
  const [revenue, setRevenue] = useState(0);
  const [products, setProducts] = useState([]);
  const [manpower, setManpower] = useState([]);
  const [customCharges, setCustomCharges] = useState([]);

  // --- NEW: BG Input State (Base Value) ---
  const [bgInput, setBgInput] = useState(0);

  // Fixed Fields
  const [opsCosts, setOpsCosts] = useState({
    freight: 0,
    installation: 0,
    gst: 0,
    adminPercent: 1,
    finance: 0, // This stores the CALCULATED 6% cost, not the input
    insurance: 0,
    gem: 0,
    misc: 0,
  });

  const [summary, setSummary] = useState({
    totalCost: 0,
    margin: 0,
    marginPercent: 0,
    adminVal: 0,
  });

  useEffect(() => {
    fetchSheet();
  }, [id]);

  const fetchSheet = async () => {
    try {
      const { data } = await axios.get(`/api/project-cost/deal/${id}`, {
        headers: getAuthHeader(),
      });

      setRevenue(data.totalRevenue || 0);
      setProducts(data.products || []);
      setManpower(data.manpower || []);
      setCustomCharges(data.customCharges || []);
      setPoFile(data.poFile || null);
      setCurrentVersion(data.version || 1);

      // --- REVERSE CALCULATE BG INPUT ---
      // If we have a saved cost (e.g. 6000), show the base value (100000)
      const savedFinanceCost = data.financeCost || 0;
      setBgInput(
        savedFinanceCost > 0 ? (savedFinanceCost / 0.06).toFixed(0) : 0
      );

      setOpsCosts({
        freight: data.freightCost || 0,
        installation: data.installationCost || 0,
        gst: data.totalGstCost || 0,
        adminPercent: data.adminOverheadPercent || 1,
        finance: savedFinanceCost,
        insurance: data.insuranceCost || 0,
        gem: data.gemCost || 0,
        misc: data.miscCost || 0,
      });
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // --- PO UPLOAD HANDLER ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.warning("File is too large. Max 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("poFile", file);

    setUploading(true);
    try {
      const { data } = await axios.post(
        `/api/project-cost/${id}/upload-po`,
        formData,
        {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setPoFile(data.poFile);
      toast.success("PO Uploaded Successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to upload PO");
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    const prodTotal = products.reduce(
      (acc, p) => acc + Number(p.qty) * Number(p.oemPrice),
      0
    );
    const manTotal = manpower.reduce(
      (acc, m) =>
        acc + (Number(m.year1Cost) + Number(m.year2Cost) + Number(m.year3Cost)),
      0
    );
    const customTotal = customCharges.reduce(
      (acc, c) => acc + Number(c.amount || 0),
      0
    );

    const baseCost = prodTotal + manTotal;
    const adminVal = baseCost * (Number(opsCosts.adminPercent) / 100);

    const totalProjectCost =
      baseCost +
      adminVal +
      Number(opsCosts.finance) +
      Number(opsCosts.insurance) +
      Number(opsCosts.gem) +
      Number(opsCosts.misc) +
      Number(opsCosts.freight) +
      Number(opsCosts.installation) +
      Number(opsCosts.gst) +
      customTotal;

    const margin = Number(revenue) - totalProjectCost;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    setSummary({
      totalCost: totalProjectCost,
      margin,
      marginPercent,
      adminVal,
    });
  }, [revenue, products, manpower, opsCosts, customCharges]);

  // --- HANDLERS ---
  const handleProductChange = (i, f, v) => {
    const a = [...products];
    a[i][f] = v;
    setProducts(a);
  };
  const addProduct = () =>
    setProducts([...products, { name: "", qty: 1, oemPrice: 0 }]);
  const removeProduct = (i) =>
    setProducts(products.filter((_, idx) => idx !== i));

  const handleManpowerChange = (i, f, v) => {
    const a = [...manpower];
    a[i][f] = v;
    setManpower(a);
  };
  const applyCola = (i) => {
    const a = [...manpower];
    const y1 = Number(a[i].year1Cost);
    a[i].year2Cost = Math.round(y1 * 1.06);
    a[i].year3Cost = Math.round(y1 * 1.06 * 1.06);
    setManpower(a);
  };
  const addManpower = () =>
    setManpower([
      ...manpower,
      {
        profile: "",
        qty: 1,
        year1Cost: 0,
        year2Cost: 0,
        year3Cost: 0,
      },
    ]);
  const removeManpower = (i) =>
    setManpower(manpower.filter((_, idx) => idx !== i));

  const handleCustomChange = (i, f, v) => {
    const a = [...customCharges];
    a[i][f] = v;
    setCustomCharges(a);
  };
  const addCustomCharge = () =>
    setCustomCharges([...customCharges, { name: "", amount: 0 }]);
  const removeCustomCharge = (i) =>
    setCustomCharges(customCharges.filter((_, idx) => idx !== i));

  // --- NEW: BG Calculation Handler ---
  const handleBgChange = (e) => {
    const val = e.target.value;
    setBgInput(val); // Update Input Field
    // Calculate 6% Cost
    const cost = Number(val) * 0.06;
    setOpsCosts((prev) => ({ ...prev, finance: cost }));
  };

  const handleSave = async (asNewVersion = false) => {
    try {
      const payload = {
        dealId: id,
        createNewVersion: asNewVersion,
        totalRevenue: Number(revenue),
        products: products.map((p) => ({
          ...p,
          qty: Number(p.qty),
          oemPrice: Number(p.oemPrice),
        })),
        manpower: manpower.map((m) => ({
          ...m,
          qty: Number(m.qty),
          year1Cost: Number(m.year1Cost),
          year2Cost: Number(m.year2Cost),
          year3Cost: Number(m.year3Cost),
        })),
        customCharges: customCharges.map((c) => ({
          name: c.name,
          amount: Number(c.amount),
        })),
        adminOverheadPercent: Number(opsCosts.adminPercent),
        financeCost: Number(opsCosts.finance),
        insuranceCost: Number(opsCosts.insurance),
        gemCost: Number(opsCosts.gem),
        miscCost: Number(opsCosts.misc),
        freightCost: Number(opsCosts.freight),
        installationCost: Number(opsCosts.installation),
        totalGstCost: Number(opsCosts.gst),
      };

      const res = await axios.post("/api/project-cost", payload, {
        headers: getAuthHeader(),
      });

      if (asNewVersion) {
        toast.success(`Saved as Version ${res.data.version}`);
        setCurrentVersion(res.data.version);
      } else {
        toast.success("Saved Successfully");
      }
    } catch (err) {
      console.error(err);
      toast.error("Save failed.");
    }
  };

  if (loading)
    return (
      <Box display="flex" justify="center" p={4}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        variant="outlined"
      >
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
          <Box ml={1}>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              Project Cost Sheet
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Current Version:
              </Typography>
              <Chip label={`V${currentVersion}`} size="small" color="primary" />
            </Box>
          </Box>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <Box>
            <input
              accept="application/pdf,image/*"
              style={{ display: "none" }}
              id="po-upload-button"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="po-upload-button">
              <Button
                variant="outlined"
                component="span"
                disabled={uploading}
                startIcon={
                  uploading ? <CircularProgress size={20} /> : <CloudUpload />
                }
              >
                {poFile ? "Update PO" : "Upload PO"}
              </Button>
            </label>
          </Box>

          {poFile && (
            <Button
              variant="text"
              startIcon={<Visibility />}
              href={poFile.path}
              target="_blank"
              rel="noopener noreferrer"
              color="success"
            >
              View PO
            </Button>
          )}

          <Box sx={{ height: 30, borderLeft: "1px solid #ddd", mx: 1 }} />
          <Button variant="outlined" onClick={() => handleSave(false)}>
            Save
          </Button>
          <Button
            variant="contained"
            startIcon={<History />}
            onClick={() => handleSave(true)}
          >
            Save New Version
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, bgcolor: "#fff" }} variant="outlined">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              label="Expected Revenue (Order Value)"
              fullWidth
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              InputProps={{ sx: { fontSize: 18, fontWeight: "bold" } }}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Box
              display="flex"
              justifyContent="flex-end"
              gap={4}
              textAlign="right"
            >
              <Box>
                <Typography variant="caption">Total Project Cost</Typography>
                <Typography variant="h6" color="error.main">
                  ₹ {summary.totalCost.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ borderLeft: "1px solid #ddd", pl: 3 }}>
                <Typography variant="caption">Final Net Margin</Typography>
                <Typography
                  variant="h4"
                  color={summary.margin >= 0 ? "success.main" : "error.main"}
                  fontWeight={700}
                >
                  ₹ {summary.margin.toLocaleString()}
                </Typography>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color={summary.margin >= 0 ? "success.main" : "error.main"}
                >
                  {summary.marginPercent.toFixed(2)}%
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Tabs
        value={tabIndex}
        onChange={(e, v) => setTabIndex(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="1. OEM / Hardware Cost" />
        <Tab label="2. Manpower Cost" />
        <Tab label="3. Operational & Statutory Charges" />
      </Tabs>

      {/* TAB 1 */}
      {tabIndex === 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f9fafb" }}>
                  <TableCell>Item Name</TableCell>
                  <TableCell width={100}>Qty</TableCell>
                  <TableCell width={150}>Vendor Unit Price</TableCell>
                  <TableCell width={150}>Total OEM Cost</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={p.name}
                        onChange={(e) =>
                          handleProductChange(i, "name", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={p.qty}
                        onChange={(e) =>
                          handleProductChange(i, "qty", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={p.oemPrice}
                        onChange={(e) =>
                          handleProductChange(i, "oemPrice", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      ₹ {(p.qty * p.oemPrice).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => removeProduct(i)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<Add />} onClick={addProduct} sx={{ mt: 2 }}>
            Add Item
          </Button>
        </Paper>
      )}

      {/* TAB 2 */}
      {tabIndex === 1 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f9fafb" }}>
                  <TableCell>Profile</TableCell>
                  <TableCell width={80}>Qty</TableCell>
                  <TableCell>Year 1</TableCell>
                  <TableCell>Year 2</TableCell>
                  <TableCell>Year 3</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manpower.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={m.profile}
                        onChange={(e) =>
                          handleManpowerChange(i, "profile", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={m.qty}
                        onChange={(e) =>
                          handleManpowerChange(i, "qty", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={m.year1Cost}
                        onChange={(e) =>
                          handleManpowerChange(i, "year1Cost", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={m.year2Cost}
                        onChange={(e) =>
                          handleManpowerChange(i, "year2Cost", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={m.year3Cost}
                        onChange={(e) =>
                          handleManpowerChange(i, "year3Cost", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      ₹{" "}
                      {(
                        Number(m.year1Cost) +
                        Number(m.year2Cost) +
                        Number(m.year3Cost)
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => applyCola(i)}>
                        +6%
                      </Button>
                      <IconButton
                        color="error"
                        onClick={() => removeManpower(i)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<Add />} onClick={addManpower} sx={{ mt: 2 }}>
            Add Resource
          </Button>
        </Paper>
      )}

      {/* TAB 3 */}
      {tabIndex === 2 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f9fafb" }}>
                  <TableCell>Charge Type</TableCell>
                  <TableCell>Value Input</TableCell>
                  <TableCell align="right">Calculated Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    Freight Charges
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Editable
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={opsCosts.freight}
                      onChange={(e) =>
                        setOpsCosts({ ...opsCosts, freight: e.target.value })
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <EditIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₹ {Number(opsCosts.freight).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Installation Charges
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Editable
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={opsCosts.installation}
                      onChange={(e) =>
                        setOpsCosts({
                          ...opsCosts,
                          installation: e.target.value,
                        })
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <EditIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₹ {Number(opsCosts.installation).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST</TableCell>
                  <TableCell>
                    <TextField disabled size="small" value={opsCosts.gst} />
                  </TableCell>
                  <TableCell align="right">
                    ₹ {Number(opsCosts.gst).toLocaleString()}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>Admin Overhead (1% Default)</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      label="Percent %"
                      value={opsCosts.adminPercent}
                      onChange={(e) =>
                        setOpsCosts({
                          ...opsCosts,
                          adminPercent: e.target.value,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₹ {summary.adminVal.toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* --- UPDATED: FINANCIAL COST (BG) ROW --- */}
                <TableRow>
                  <TableCell>
                    Financial Cost (BG / Bank Charges)
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Auto-calculated @ 6% of BG Value
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      label="Input BG Value ₹"
                      value={bgInput}
                      onChange={handleBgChange}
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₹{" "}
                    {Number(opsCosts.finance).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
                {/* -------------------------------------- */}

                <TableRow>
                  <TableCell>Insurance Cost</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={opsCosts.insurance}
                      onChange={(e) =>
                        setOpsCosts({
                          ...opsCosts,
                          insurance: e.target.value,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₹ {Number(opsCosts.insurance).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>GEM / Portal Cost</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={opsCosts.gem}
                      onChange={(e) =>
                        setOpsCosts({ ...opsCosts, gem: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₹ {Number(opsCosts.gem).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Miscellaneous Charges</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={opsCosts.misc}
                      onChange={(e) =>
                        setOpsCosts({ ...opsCosts, misc: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    ₹ {Number(opsCosts.misc).toLocaleString()}
                  </TableCell>
                </TableRow>

                <TableRow sx={{ bgcolor: "#fff7ed" }}>
                  <TableCell colSpan={3}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Custom Charges
                    </Typography>
                  </TableCell>
                </TableRow>
                {customCharges.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Charge Name"
                        value={c.name}
                        onChange={(e) =>
                          handleCustomChange(i, "name", e.target.value)
                        }
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Amount"
                        value={c.amount}
                        onChange={(e) =>
                          handleCustomChange(i, "amount", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeCustomCharge(i)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3}>
                    <Button
                      startIcon={<Add />}
                      size="small"
                      onClick={addCustomCharge}
                    >
                      Add More Charges
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow sx={{ bgcolor: "#f0fdf4" }}>
                  <TableCell colSpan={2} align="right">
                    <strong>Total Operational & Statutory Charges:</strong>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    ₹{" "}
                    {(
                      summary.adminVal +
                      Number(opsCosts.finance) +
                      Number(opsCosts.insurance) +
                      Number(opsCosts.gem) +
                      Number(opsCosts.misc) +
                      Number(opsCosts.freight) +
                      Number(opsCosts.installation) +
                      Number(opsCosts.gst) +
                      customCharges.reduce(
                        (acc, c) => acc + Number(c.amount || 0),
                        0
                      )
                    ).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}

export default ProjectCostSheet;
