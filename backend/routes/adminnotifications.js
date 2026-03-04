const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/notifications
router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const allNotifications = await prisma.notification.findMany({
      where: { organizationId: orgId },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Split them into Drafts and Published
    const published = allNotifications.filter((n) => !n.isDraft);
    const drafts = allNotifications.filter((n) => n.isDraft);

    const departments = await prisma.department.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });

    const employees = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true, role: "EMPLOYEE" },
      // ✅ VITAL FIX: Added departmentId: true here so the frontend filter works!
      select: { id: true, name: true, empId: true, departmentId: true },
    });

    res
      .status(200)
      .json({ notifications: published, drafts, departments, employees });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// POST /api/admin/notifications (Create new Draft or Publish directly)
router.post("/", async (req, res) => {
  try {
    const { title, message, targetType, targetId, isDraft } = req.body;
    const orgId = req.user.organizationId;

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        targetType,
        targetId: targetType !== "ALL" ? targetId : null,
        isDraft: isDraft || false,
        organizationId: orgId,
        senderId: req.user.id,
      },
      include: { sender: { select: { name: true } } },
    });

    if (!isDraft) {
      let userIds = [];
      if (targetType === "ALL") {
        const users = await prisma.user.findMany({
          where: { organizationId: orgId, isActive: true },
          select: { id: true },
        });
        userIds = users.map((u) => u.id);
      } else if (targetType === "DEPARTMENT") {
        const users = await prisma.user.findMany({
          where: { departmentId: targetId, isActive: true },
          select: { id: true },
        });
        userIds = users.map((u) => u.id);
      } else if (targetType === "INDIVIDUAL") {
        userIds = [targetId];
      }

      if (userIds.length > 0) {
        const recipientData = userIds.map((id) => ({
          notificationId: notification.id,
          userId: id,
          isRead: false,
        }));
        await prisma.notificationRecipient.createMany({ data: recipientData });

        // 🚨 NEW: THE REAL-TIME MAGIC 🚨
        // Get the io instance we saved in server.js
        const io = req.app.get("io");

        // Loop through every targeted user and emit the notification directly to their personal room
        userIds.forEach((id) => {
          io.to(id).emit("new_notification", {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            senderName: notification.sender.name,
            createdAt: notification.createdAt,
            isRead: false,
          });
        });
      }
    }

    return res.status(201).json(notification);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create notification" });
  }
});

// PUT /api/admin/notifications/:id (Update a Draft / Publish a Draft)
router.put("/:id", async (req, res) => {
  try {
    const { title, message, targetType, targetId, isDraft } = req.body;
    const notificationId = req.params.id;
    const orgId = req.user.organizationId;

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        title,
        message,
        targetType,
        targetId: targetType !== "ALL" ? targetId : null,
        isDraft: isDraft,
      },
      include: { sender: { select: { name: true } } },
    });

    // If it is NO LONGER a draft, figure out who gets it and send it!
    if (!isDraft) {
      let userIds = [];
      if (targetType === "ALL") {
        const users = await prisma.user.findMany({
          where: { organizationId: orgId, isActive: true },
          select: { id: true },
        });
        userIds = users.map((u) => u.id);
      } else if (targetType === "DEPARTMENT") {
        const users = await prisma.user.findMany({
          where: { departmentId: targetId, isActive: true },
          select: { id: true },
        });
        userIds = users.map((u) => u.id);
      } else if (targetType === "INDIVIDUAL") {
        userIds = [targetId];
      }

      if (userIds.length > 0) {
        // 1. Save to the database so it stays there forever
        const recipientData = userIds.map((id) => ({
          notificationId: updatedNotification.id,
          userId: id,
          isRead: false,
        }));
        await prisma.notificationRecipient.createMany({ data: recipientData });

        // 🚨 2. SOCKET.IO REAL-TIME PUSH 🚨
        const io = req.app.get("io"); // Grab the socket instance we set in server.js

        userIds.forEach((id) => {
          // Push to each specific employee's private WebSocket room
          io.to(id).emit("new_notification", {
            id: updatedNotification.id,
            title: updatedNotification.title,
            message: updatedNotification.message,
            senderName: updatedNotification.sender.name,
            createdAt: updatedNotification.createdAt,
            isRead: false,
          });
        });
      }
    }

    return res.status(200).json(updatedNotification);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update notification" });
  }
});

// DELETE /api/admin/notifications/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.notificationRecipient.deleteMany({
      where: { notificationId: req.params.id },
    });
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

module.exports = router;
