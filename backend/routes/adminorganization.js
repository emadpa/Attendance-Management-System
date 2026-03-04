const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// Mock Auth
// GET /api/admin/organization
router.get("/", async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    return res.json(org);
  } catch (error) {
    console.error("Fetch org error:", error);
    res.status(500).json({ error: "Failed to fetch organization settings" });
  }
});

// PUT /api/admin/organization
router.put("/", async (req, res) => {
  try {
    const {
      name,
      contactEmail,
      timeZone,
      latitude,
      longitude,
      allowedRadiusInMeters,
      strictGeofence,
    } = req.body;

    // Convert strings back to correct Prisma data types
    const updatedOrg = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: {
        name,
        contactEmail,
        timeZone,
        // If latitude/longitude are empty strings, save as null
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        allowedRadiusInMeters: parseInt(allowedRadiusInMeters),
        strictGeofence: strictGeofence === true || strictGeofence === "true",
      },
    });

    res.json({ message: "Organization updated successfully", org: updatedOrg });
  } catch (error) {
    console.error("Update org error:", error);
    res.status(500).json({ error: "Failed to update organization settings" });
  }
});

module.exports = router;
