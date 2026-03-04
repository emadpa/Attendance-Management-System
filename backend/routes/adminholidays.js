const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// Helper: Convert "YYYY-MM-DD" to a Date object strictly at midnight UTC
const parseDate = (dateStr) => new Date(`${dateStr}T00:00:00Z`);

// ==========================================
// GET: Fetch all holidays for the organization
// ==========================================
router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    // Fetch and sort chronologically
    const holidays = await prisma.holiday.findMany({
      where: { organizationId: orgId },
      orderBy: { date: "asc" },
    });

    return res.status(200).json(holidays);
  } catch (error) {
    console.error("Fetch holidays error:", error);
    return res.status(500).json({ error: "Failed to fetch holidays" });
  }
});

// ==========================================
// POST: Auto-Fill standard national holidays
// ==========================================
// ==========================================
// POST: Auto-Fill standard national holidays
// ==========================================
router.post("/auto-fill", async (req, res) => {
  try {
    const { year, countryCode } = req.body;
    const orgId = req.user.organizationId;

    if (!year || !countryCode) {
      return res
        .status(400)
        .json({ error: "Year and Country Code are required" });
    }

    // 1. Fetch from the API using DYNAMIC variables
    const response = await fetch(
      `https://calendarific.com/api/v2/holidays?api_key=G15PYopKQrmDsg6IrrJInor6q67sCQyt&country=${countryCode}&year=${year}`,
    );

    if (response.status === 404) {
      return res
        .status(400)
        .json({ error: "Country code not supported by the public API." });
    }

    if (response.status === 204) {
      if (countryCode === "IN") {
        const fallbackHolidays = [
          {
            name: "Republic Day",
            date: new Date(`${year}-01-26T00:00:00Z`),
            organizationId: orgId,
          },
          {
            name: "Labour Day",
            date: new Date(`${year}-05-01T00:00:00Z`),
            organizationId: orgId,
          },
          {
            name: "Independence Day",
            date: new Date(`${year}-08-15T00:00:00Z`),
            organizationId: orgId,
          },
          {
            name: "Gandhi Jayanti",
            date: new Date(`${year}-10-02T00:00:00Z`),
            organizationId: orgId,
          },
          {
            name: "Christmas Day",
            date: new Date(`${year}-12-25T00:00:00Z`),
            organizationId: orgId,
          },
        ];

        await prisma.holiday.createMany({
          data: fallbackHolidays,
          skipDuplicates: true,
        });

        return res.status(201).json({
          message: `API data unavailable. Auto-filled using standard Indian holidays for ${year}!`,
        });
      }
      return res.status(400).json({
        error: `No holiday data available for ${countryCode} in ${year}.`,
      });
    }

    if (!response.ok) {
      return res
        .status(400)
        .json({ error: "Failed to fetch from external API." });
    }

    // 2. Parse the JSON
    const apiResult = await response.json();

    // 🚨 FIX 1: Dig into the Calendarific object to find the array
    const holidaysArray = apiResult.response.holidays;

    // 🚨 FIX 2 & 3: Filter out non-national holidays and prevent duplicate dates
    const uniqueHolidaysMap = new Map();

    holidaysArray.forEach((h) => {
      // Only grab official National Holidays (otherwise you get 100+ random observances)
      if (h.type && h.type.includes("National holiday")) {
        // Calendarific stores dates in `h.date.iso` (e.g., "2026-01-26")
        const dateString = h.date.iso.split("T")[0];

        // Only add it if we haven't already added a holiday on this exact date
        if (!uniqueHolidaysMap.has(dateString)) {
          uniqueHolidaysMap.set(dateString, {
            name: h.name,
            date: new Date(`${dateString}T00:00:00Z`),
            organizationId: orgId,
          });
        }
      }
    });

    // Convert our Map back into a clean array for Prisma
    const newHolidaysData = Array.from(uniqueHolidaysMap.values());

    // 3. Bulk insert
    await prisma.holiday.createMany({
      data: newHolidaysData,
      skipDuplicates: true,
    });

    return res
      .status(201)
      .json({ message: `Holidays for ${year} auto-filled successfully!` });
  } catch (error) {
    console.error("Auto-fill error:", error);
    return res.status(500).json({ error: "Failed to auto-fill holidays" });
  }
});
// ==========================================
// POST: Create a single custom holiday
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { name, date } = req.body;
    const orgId = req.user.organizationId;

    if (!name || !date) {
      return res.status(400).json({ error: "Name and Date are required" });
    }

    const safeDate = parseDate(date);

    // Prevent adding two different holidays on the exact same day
    const existing = await prisma.holiday.findFirst({
      where: { organizationId: orgId, date: safeDate },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: "A holiday already exists on this date." });
    }

    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: safeDate,
        organizationId: orgId,
      },
    });

    return res.status(201).json(holiday);
  } catch (error) {
    console.error("Create holiday error:", error);
    return res.status(500).json({ error: "Failed to create holiday" });
  }
});

// ==========================================
// PUT: Edit an existing holiday
// ==========================================
router.put("/:id", async (req, res) => {
  try {
    const { name, date } = req.body;
    const orgId = req.user.organizationId;
    const holidayId = req.params.id;

    if (!name || !date) {
      return res.status(400).json({ error: "Name and Date are required" });
    }

    const safeDate = parseDate(date);

    // We use updateMany as a security measure so an Admin can't edit another org's holiday
    const updatedHoliday = await prisma.holiday.updateMany({
      where: {
        id: holidayId,
        organizationId: orgId,
      },
      data: {
        name,
        date: safeDate,
      },
    });

    if (updatedHoliday.count === 0) {
      return res
        .status(404)
        .json({ error: "Holiday not found or unauthorized" });
    }

    return res.status(200).json({ message: "Holiday updated successfully" });
  } catch (error) {
    console.error("Update holiday error:", error);
    return res.status(500).json({ error: "Failed to update holiday" });
  }
});

// ==========================================
// DELETE: Remove a holiday
// ==========================================
router.delete("/:id", async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const holidayId = req.params.id;

    // Security check: Ensure the holiday belongs to this org before deleting
    const holiday = await prisma.holiday.findFirst({
      where: { id: holidayId, organizationId: orgId },
    });

    if (!holiday) {
      return res
        .status(404)
        .json({ error: "Holiday not found or unauthorized" });
    }

    await prisma.holiday.delete({
      where: { id: holidayId },
    });

    return res.status(200).json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("Delete holiday error:", error);
    return res.status(500).json({ error: "Failed to delete holiday" });
  }
});

module.exports = router;
