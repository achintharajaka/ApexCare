import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { staffMembers, leaveRecords, users, tenant, logAudit, StaffMember, User, saveStorage } from "../../db/store.js";
import { notifyChange } from "../realtime/realtime.service.js";

export const staffRouter = Router();

// 1. READ: Get hospital staff directory (enhanced with associated username)
staffRouter.get("/", (req: Request, res: Response) => {
  const { department, role, search } = req.query;

  // Ensure all registered users in the system have corresponding staff directory entries
  let hasAdded = false;
  for (const u of users) {
    const exists = staffMembers.some(
      (s) =>
        s.id === u.id ||
        s.email.toLowerCase() === u.email.toLowerCase() ||
        s.fullName.toLowerCase() === u.fullName.toLowerCase() ||
        (s as any).username?.toLowerCase() === u.username.toLowerCase()
    );
    if (!exists) {
      let maxNum = 0;
      for (const sm of staffMembers) {
        const match = sm.employeeId.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      staffMembers.push({
        id: u.id,
        employeeId: `EMP-${String(maxNum + 1).padStart(3, "0")}`,
        fullName: u.fullName,
        role: u.role,
        department: u.department || "General Hospital",
        jobTitle: u.jobTitle || `${u.role} Staff`,
        phoneNumber: (u as any).phoneNumber || "+94 77 000 0000",
        attendanceStatus: "Present",
        shift: (u as any).shift || "Day Shift (08:00 - 16:30)",
        email: u.email,
        joiningDate: new Date().toISOString().split("T")[0],
        specialization: (u as any).specialization,
        roomNumber: (u as any).roomNumber,
        consultationFee: (u as any).consultationFee,
      });
      hasAdded = true;
    }
  }
  if (hasAdded) {
    saveStorage();
  }

  let filtered = [...staffMembers];

  if (department && department !== "All") {
    filtered = filtered.filter((s) => s.department.toLowerCase().includes((department as string).toLowerCase()));
  }

  if (role && role !== "All") {
    filtered = filtered.filter((s) => s.role.toLowerCase() === (role as string).toLowerCase());
  }

  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter((s) => s.fullName.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q));
  }

  // Attach associated user account info for each staff member
  const enriched = filtered.map((s) => {
    const linkedUser = users.find(
      (u) => u.email.toLowerCase() === s.email.toLowerCase() || u.fullName.toLowerCase() === s.fullName.toLowerCase()
    );
    return {
      ...s,
      username: linkedUser?.username || "",
      userId: linkedUser?.id || "",
    };
  });

  return res.json(enriched);
});


// 2. ATTENDANCE: Toggle daily attendance
staffRouter.post("/attendance", (req: Request, res: Response) => {
  const { employeeId, status } = req.body;
  const staff = staffMembers.find((s) => s.id === employeeId || s.employeeId === employeeId);

  if (!staff) {
    return res.status(404).json({ error: "Staff member not found" });
  }

  staff.attendanceStatus = status || (staff.attendanceStatus === "Present" ? "Absent" : "Present");
  saveStorage();
  notifyChange("staff", "attendance", staff);
  logAudit(`STAFF_ATTENDANCE_${staff.attendanceStatus.toUpperCase()}`, "Employee", staff.id, (req as any).user?.id || "usr-admin-01", req.ip);

  return res.json({ message: "Attendance status updated", staff });
});

// 3. LEAVE: Get leave records
staffRouter.get("/leave", (_req: Request, res: Response) => {
  return res.json(leaveRecords);
});

// 4. LEAVE: Submit leave request
staffRouter.post("/leave", (req: Request, res: Response) => {
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;

  const staff = staffMembers.find((s) => s.id === employeeId || s.employeeId === employeeId);
  const empId = staff ? staff.id : (employeeId || "emp-001");
  const empName = staff ? staff.fullName : (req.body.employeeName || "Staff Member");

  const newLeave = {
    id: `lve-${uuidv4().substring(0, 8)}`,
    employeeId: empId,
    employeeName: empName,
    leaveType: leaveType || "Casual Leave",
    startDate: startDate || new Date().toISOString().split("T")[0],
    endDate: endDate || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    reason: reason || "Personal Health / Family Matter",
    status: "Pending",
  };

  leaveRecords.unshift(newLeave);
  saveStorage();
  notifyChange("staff", "leave_submit", newLeave);
  logAudit("LEAVE_REQUEST_SUBMITTED", "LeaveRecord", newLeave.id, empId, req.ip);

  return res.status(201).json(newLeave);
});

// 5. LEAVE: Approve or reject leave
staffRouter.patch("/leave/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const leave = leaveRecords.find((l) => l.id === id);
  if (!leave) {
    return res.status(404).json({ error: "Leave record not found" });
  }

  leave.status = status;
  saveStorage();
  notifyChange("staff", "leave_status", leave);
  logAudit(`LEAVE_${status.toUpperCase()}`, "LeaveRecord", leave.id, (req as any).user?.id || "usr-admin-01", req.ip);

  return res.json(leave);
});

// 6. READ: Get individual staff member details
staffRouter.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const staff = staffMembers.find((s) => s.id === id || s.employeeId === id);

  if (!staff) {
    return res.status(404).json({ error: "Staff member not found" });
  }

  const linkedUser = users.find(
    (u) => u.email.toLowerCase() === staff.email.toLowerCase() || u.fullName.toLowerCase() === staff.fullName.toLowerCase()
  );

  return res.json({
    ...staff,
    username: linkedUser?.username || "",
    userId: linkedUser?.id || "",
    isActive: linkedUser?.isActive ?? true,
  });
});

// 3. CREATE: Register new staff member or doctor + create login user credentials (superadmin functionality)
staffRouter.post("/", async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      role,
      department,
      jobTitle,
      phoneNumber,
      email,
      shift,
      username,
      password,
      specialization,
      roomNumber,
      consultationFee,
    } = req.body;

    if (!fullName || !role || !department || !username || !password || !email) {
      return res.status(400).json({
        error: "Full Name, Role, Department, Username, Password, and Email are required fields.",
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username or email already exists
    const existingUser = users.find(
      (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      return res.status(400).json({
        error: "An account with this username or email already exists. Please choose a different username/email.",
      });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const userId = `usr-${uuidv4().substring(0, 8)}`;
    let maxNum = 0;
    for (const sm of staffMembers) {
      const match = sm.employeeId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const employeeId = `EMP-${String(maxNum + 1).padStart(3, "0")}`;
    const staffId = `emp-${uuidv4().substring(0, 8)}`;

    const normalizedRole = role.toUpperCase();
    const formattedJobTitle = jobTitle?.trim() || `${normalizedRole.replace('_', ' ')} Staff`;

    const newUser: User = {
      id: userId,
      tenantId: tenant.id,
      username: cleanUsername,
      passwordHash,
      fullName: fullName.trim(),
      email: cleanEmail,
      role: normalizedRole,
      isActive: true,
      jobTitle: formattedJobTitle,
      department: department.trim(),
      roomNumber: roomNumber?.trim() || (normalizedRole === "DOCTOR" ? "Consultation Room" : undefined),
      consultationFee: consultationFee ? Number(consultationFee) : (normalizedRole === "DOCTOR" ? 2500 : 0),
      specialization: specialization?.trim() || undefined,
    };

    const newStaff: StaffMember = {
      id: staffId,
      employeeId,
      fullName: fullName.trim(),
      role: normalizedRole,
      department: department.trim(),
      jobTitle: formattedJobTitle,
      phoneNumber: phoneNumber?.trim() || "+94 77 000 0000",
      attendanceStatus: "Present",
      shift: shift?.trim() || "Day Shift (08:00 - 16:30)",
      email: cleanEmail,
      joiningDate: new Date().toISOString().split("T")[0],
      specialization: specialization?.trim() || undefined,
      roomNumber: roomNumber?.trim() || undefined,
      consultationFee: consultationFee ? Number(consultationFee) : (normalizedRole === "DOCTOR" ? 2500 : undefined),
    };

    users.push(newUser);
    staffMembers.push(newStaff);
    saveStorage();
    notifyChange("staff", "create", newStaff);

    logAudit(
      normalizedRole === "DOCTOR" ? "DOCTOR_REGISTERED" : "STAFF_REGISTERED",
      "StaffMember",
      staffId,
      (req as any).user?.id || "usr-admin-01",
      req.ip
    );

    return res.status(201).json({
      message: `${normalizedRole === "DOCTOR" ? "Doctor" : "Staff member"} registered successfully with login credentials`,
      staff: {
        ...newStaff,
        username: newUser.username,
        userId: newUser.id,
      },
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
      },
    });
  } catch (err: any) {
    console.error("Staff registration failed:", err);
    return res.status(500).json({ error: "Failed to register staff member." });
  }
});

// 4. UPDATE: Update staff member details + sync with user login credentials (superadmin functionality)
const handleUpdateStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffIndex = staffMembers.findIndex((s) => s.id === id || s.employeeId === id);

    if (staffIndex === -1) {
      return res.status(404).json({ error: "Staff member record not found." });
    }

    const currentStaff = staffMembers[staffIndex];
    const {
      fullName,
      role,
      department,
      jobTitle,
      phoneNumber,
      email,
      shift,
      specialization,
      roomNumber,
      consultationFee,
      attendanceStatus,
      newPassword,
    } = req.body;

    // Check if new email is being assigned and conflicts with an existing different user
    if (email && email.trim().toLowerCase() !== currentStaff.email.toLowerCase()) {
      const emailConflict = users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.email.toLowerCase() !== currentStaff.email.toLowerCase()
      );
      if (emailConflict) {
        return res.status(400).json({ error: "Another account already uses this email address." });
      }
    }

    const normalizedRole = role ? role.toUpperCase() : currentStaff.role;
    const previousEmail = currentStaff.email;
    const cleanEmail = email ? email.trim().toLowerCase() : currentStaff.email;

    // Update staff member fields
    currentStaff.fullName = fullName !== undefined ? fullName.trim() : currentStaff.fullName;
    currentStaff.role = normalizedRole;
    currentStaff.department = department !== undefined ? department.trim() : currentStaff.department;
    currentStaff.jobTitle = jobTitle !== undefined ? jobTitle.trim() : currentStaff.jobTitle;
    currentStaff.phoneNumber = phoneNumber !== undefined ? phoneNumber.trim() : currentStaff.phoneNumber;
    currentStaff.email = cleanEmail;
    currentStaff.shift = shift !== undefined ? shift.trim() : currentStaff.shift;
    currentStaff.specialization = specialization !== undefined ? specialization.trim() || undefined : currentStaff.specialization;
    currentStaff.roomNumber = roomNumber !== undefined ? roomNumber.trim() || undefined : currentStaff.roomNumber;
    currentStaff.consultationFee = consultationFee !== undefined ? (consultationFee ? Number(consultationFee) : undefined) : currentStaff.consultationFee;
    if (attendanceStatus) {
      currentStaff.attendanceStatus = attendanceStatus;
    }

    // Synchronize linked User account
    const linkedUser = users.find(
      (u) => u.email.toLowerCase() === previousEmail.toLowerCase() || u.fullName.toLowerCase() === currentStaff.fullName.toLowerCase()
    );

    if (linkedUser) {
      linkedUser.fullName = currentStaff.fullName;
      linkedUser.role = currentStaff.role;
      linkedUser.department = currentStaff.department;
      linkedUser.jobTitle = currentStaff.jobTitle;
      linkedUser.email = currentStaff.email;
      linkedUser.specialization = currentStaff.specialization;
      linkedUser.roomNumber = currentStaff.roomNumber;
      linkedUser.consultationFee = currentStaff.consultationFee;

      // Update password if requested by Super Admin
      if (newPassword && newPassword.trim().length >= 6) {
        linkedUser.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      }
    }

    saveStorage();
    notifyChange("staff", "update", currentStaff);

    logAudit("STAFF_UPDATED", "StaffMember", currentStaff.id, (req as any).user?.id || "usr-admin-01", req.ip);

    return res.json({
      message: "Staff member details updated successfully.",
      staff: {
        ...currentStaff,
        username: linkedUser?.username || "",
        userId: linkedUser?.id || "",
      },
    });
  } catch (err: any) {
    console.error("Staff update failed:", err);
    return res.status(500).json({ error: "Failed to update staff member details." });
  }
};

staffRouter.put("/:id", handleUpdateStaff);
staffRouter.patch("/:id", handleUpdateStaff);

// 5. DELETE: Delete staff member & revoke credentials (superadmin functionality)
staffRouter.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffIndex = staffMembers.findIndex((s) => s.id === id || s.employeeId === id);

    if (staffIndex === -1) {
      return res.status(404).json({ error: "Staff member not found." });
    }

    const staffToDelete = staffMembers[staffIndex];

    // Find associated user credentials
    const userIndex = users.findIndex(
      (u) => u.email.toLowerCase() === staffToDelete.email.toLowerCase() || u.fullName.toLowerCase() === staffToDelete.fullName.toLowerCase()
    );

    // Protection rule: Cannot delete primary super administrator
    if (
      (userIndex !== -1 && (users[userIndex].username === "superadmin" || users[userIndex].id === "usr-admin-01")) ||
      staffToDelete.email.toLowerCase() === "namal.kumara@apexcare.lk"
    ) {
      return res.status(400).json({
        error: "The primary Super Administrator account cannot be deleted as it is required for hospital governance.",
      });
    }

    // Remove from staffMembers array
    staffMembers.splice(staffIndex, 1);

    let deletedUsername = "";
    if (userIndex !== -1) {
      deletedUsername = users[userIndex].username;
      users.splice(userIndex, 1);
    }

    // Clean up associated leave records
    const initialLeaveCount = leaveRecords.length;
    for (let i = leaveRecords.length - 1; i >= 0; i--) {
      if (leaveRecords[i].employeeId === staffToDelete.id || leaveRecords[i].employeeName === staffToDelete.fullName) {
        leaveRecords.splice(i, 1);
      }
    }

    saveStorage();
    notifyChange("staff", "delete", staffToDelete);

    logAudit("STAFF_DELETED", "StaffMember", staffToDelete.id, (req as any).user?.id || "usr-admin-01", req.ip);

    return res.json({
      success: true,
      message: `Staff member "${staffToDelete.fullName}" (${staffToDelete.employeeId}) and station credentials "${deletedUsername}" were successfully deleted.`,
      deletedId: staffToDelete.id,
      deletedEmployeeId: staffToDelete.employeeId,
    });
  } catch (err: any) {
    console.error("Staff deletion failed:", err);
    return res.status(500).json({ error: "Failed to delete staff member." });
  }
});


