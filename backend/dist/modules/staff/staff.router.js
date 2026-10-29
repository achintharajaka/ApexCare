"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const store_js_1 = require("../../db/store.js");
const realtime_service_js_1 = require("../realtime/realtime.service.js");
exports.staffRouter = (0, express_1.Router)();
// 1. READ: Get hospital staff directory (enhanced with associated username)
exports.staffRouter.get("/", (req, res) => {
    const { department, role, search } = req.query;
    // Ensure all registered users in the system have corresponding staff directory entries
    let hasAdded = false;
    for (const u of store_js_1.users) {
        const exists = store_js_1.staffMembers.some((s) => s.id === u.id ||
            s.email.toLowerCase() === u.email.toLowerCase() ||
            s.fullName.toLowerCase() === u.fullName.toLowerCase() ||
            s.username?.toLowerCase() === u.username.toLowerCase());
        if (!exists) {
            let maxNum = 0;
            for (const sm of store_js_1.staffMembers) {
                const match = sm.employeeId.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxNum)
                        maxNum = num;
                }
            }
            store_js_1.staffMembers.push({
                id: u.id,
                employeeId: `EMP-${String(maxNum + 1).padStart(3, "0")}`,
                fullName: u.fullName,
                role: u.role,
                department: u.department || "General Hospital",
                jobTitle: u.jobTitle || `${u.role} Staff`,
                phoneNumber: u.phoneNumber || "+94 77 000 0000",
                attendanceStatus: "Present",
                shift: u.shift || "Day Shift (08:00 - 16:30)",
                email: u.email,
                joiningDate: new Date().toISOString().split("T")[0],
                specialization: u.specialization,
                roomNumber: u.roomNumber,
                consultationFee: u.consultationFee,
            });
            hasAdded = true;
        }
    }
    if (hasAdded) {
        (0, store_js_1.saveStorage)();
    }
    let filtered = [...store_js_1.staffMembers];
    if (department && department !== "All") {
        filtered = filtered.filter((s) => s.department.toLowerCase().includes(department.toLowerCase()));
    }
    if (role && role !== "All") {
        filtered = filtered.filter((s) => s.role.toLowerCase() === role.toLowerCase());
    }
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((s) => s.fullName.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q));
    }
    // Attach associated user account info for each staff member
    const enriched = filtered.map((s) => {
        const linkedUser = store_js_1.users.find((u) => u.email.toLowerCase() === s.email.toLowerCase() || u.fullName.toLowerCase() === s.fullName.toLowerCase());
        return {
            ...s,
            username: linkedUser?.username || "",
            userId: linkedUser?.id || "",
        };
    });
    return res.json(enriched);
});
// 2. ATTENDANCE: Toggle daily attendance
exports.staffRouter.post("/attendance", (req, res) => {
    const { employeeId, status } = req.body;
    const staff = store_js_1.staffMembers.find((s) => s.id === employeeId || s.employeeId === employeeId);
    if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
    }
    staff.attendanceStatus = status || (staff.attendanceStatus === "Present" ? "Absent" : "Present");
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("staff", "attendance", staff);
    (0, store_js_1.logAudit)(`STAFF_ATTENDANCE_${staff.attendanceStatus.toUpperCase()}`, "Employee", staff.id, req.user?.id || "usr-admin-01", req.ip);
    return res.json({ message: "Attendance status updated", staff });
});
// 3. LEAVE: Get leave records
exports.staffRouter.get("/leave", (_req, res) => {
    return res.json(store_js_1.leaveRecords);
});
// 4. LEAVE: Submit leave request
exports.staffRouter.post("/leave", (req, res) => {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    const staff = store_js_1.staffMembers.find((s) => s.id === employeeId || s.employeeId === employeeId);
    const empId = staff ? staff.id : (employeeId || "emp-001");
    const empName = staff ? staff.fullName : (req.body.employeeName || "Staff Member");
    const newLeave = {
        id: `lve-${(0, uuid_1.v4)().substring(0, 8)}`,
        employeeId: empId,
        employeeName: empName,
        leaveType: leaveType || "Casual Leave",
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        reason: reason || "Personal Health / Family Matter",
        status: "Pending",
    };
    store_js_1.leaveRecords.unshift(newLeave);
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("staff", "leave_submit", newLeave);
    (0, store_js_1.logAudit)("LEAVE_REQUEST_SUBMITTED", "LeaveRecord", newLeave.id, empId, req.ip);
    return res.status(201).json(newLeave);
});
// 5. LEAVE: Approve or reject leave
exports.staffRouter.patch("/leave/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const leave = store_js_1.leaveRecords.find((l) => l.id === id);
    if (!leave) {
        return res.status(404).json({ error: "Leave record not found" });
    }
    leave.status = status;
    (0, store_js_1.saveStorage)();
    (0, realtime_service_js_1.notifyChange)("staff", "leave_status", leave);
    (0, store_js_1.logAudit)(`LEAVE_${status.toUpperCase()}`, "LeaveRecord", leave.id, req.user?.id || "usr-admin-01", req.ip);
    return res.json(leave);
});
// 6. READ: Get individual staff member details
exports.staffRouter.get("/:id", (req, res) => {
    const { id } = req.params;
    const staff = store_js_1.staffMembers.find((s) => s.id === id || s.employeeId === id);
    if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
    }
    const linkedUser = store_js_1.users.find((u) => u.email.toLowerCase() === staff.email.toLowerCase() || u.fullName.toLowerCase() === staff.fullName.toLowerCase());
    return res.json({
        ...staff,
        username: linkedUser?.username || "",
        userId: linkedUser?.id || "",
        isActive: linkedUser?.isActive ?? true,
    });
});
// 3. CREATE: Register new staff member or doctor + create login user credentials (superadmin functionality)
exports.staffRouter.post("/", async (req, res) => {
    try {
        const { fullName, role, department, jobTitle, phoneNumber, email, shift, username, password, specialization, roomNumber, consultationFee, } = req.body;
        if (!fullName || !role || !department || !username || !password || !email) {
            return res.status(400).json({
                error: "Full Name, Role, Department, Username, Password, and Email are required fields.",
            });
        }
        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();
        // Check if username or email already exists
        const existingUser = store_js_1.users.find((u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail);
        if (existingUser) {
            return res.status(400).json({
                error: "An account with this username or email already exists. Please choose a different username/email.",
            });
        }
        const passwordHash = await bcryptjs_1.default.hash(password.trim(), 10);
        const userId = `usr-${(0, uuid_1.v4)().substring(0, 8)}`;
        let maxNum = 0;
        for (const sm of store_js_1.staffMembers) {
            const match = sm.employeeId.match(/\d+/);
            if (match) {
                const num = parseInt(match[0], 10);
                if (num > maxNum)
                    maxNum = num;
            }
        }
        const employeeId = `EMP-${String(maxNum + 1).padStart(3, "0")}`;
        const staffId = `emp-${(0, uuid_1.v4)().substring(0, 8)}`;
        const normalizedRole = role.toUpperCase();
        const formattedJobTitle = jobTitle?.trim() || `${normalizedRole.replace('_', ' ')} Staff`;
        const newUser = {
            id: userId,
            tenantId: store_js_1.tenant.id,
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
        const newStaff = {
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
        store_js_1.users.push(newUser);
        store_js_1.staffMembers.push(newStaff);
        (0, store_js_1.saveStorage)();
        (0, realtime_service_js_1.notifyChange)("staff", "create", newStaff);
        (0, store_js_1.logAudit)(normalizedRole === "DOCTOR" ? "DOCTOR_REGISTERED" : "STAFF_REGISTERED", "StaffMember", staffId, req.user?.id || "usr-admin-01", req.ip);
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
    }
    catch (err) {
        console.error("Staff registration failed:", err);
        return res.status(500).json({ error: "Failed to register staff member." });
    }
});
// 4. UPDATE: Update staff member details + sync with user login credentials (superadmin functionality)
const handleUpdateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const staffIndex = store_js_1.staffMembers.findIndex((s) => s.id === id || s.employeeId === id);
        if (staffIndex === -1) {
            return res.status(404).json({ error: "Staff member record not found." });
        }
        const currentStaff = store_js_1.staffMembers[staffIndex];
        const { fullName, role, department, jobTitle, phoneNumber, email, shift, specialization, roomNumber, consultationFee, attendanceStatus, newPassword, } = req.body;
        // Check if new email is being assigned and conflicts with an existing different user
        if (email && email.trim().toLowerCase() !== currentStaff.email.toLowerCase()) {
            const emailConflict = store_js_1.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.email.toLowerCase() !== currentStaff.email.toLowerCase());
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
        const linkedUser = store_js_1.users.find((u) => u.email.toLowerCase() === previousEmail.toLowerCase() || u.fullName.toLowerCase() === currentStaff.fullName.toLowerCase());
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
                linkedUser.passwordHash = await bcryptjs_1.default.hash(newPassword.trim(), 10);
            }
        }
        (0, store_js_1.saveStorage)();
        (0, realtime_service_js_1.notifyChange)("staff", "update", currentStaff);
        (0, store_js_1.logAudit)("STAFF_UPDATED", "StaffMember", currentStaff.id, req.user?.id || "usr-admin-01", req.ip);
        return res.json({
            message: "Staff member details updated successfully.",
            staff: {
                ...currentStaff,
                username: linkedUser?.username || "",
                userId: linkedUser?.id || "",
            },
        });
    }
    catch (err) {
        console.error("Staff update failed:", err);
        return res.status(500).json({ error: "Failed to update staff member details." });
    }
};
exports.staffRouter.put("/:id", handleUpdateStaff);
exports.staffRouter.patch("/:id", handleUpdateStaff);
// 5. DELETE: Delete staff member & revoke credentials (superadmin functionality)
exports.staffRouter.delete("/:id", (req, res) => {
    try {
        const { id } = req.params;
        const staffIndex = store_js_1.staffMembers.findIndex((s) => s.id === id || s.employeeId === id);
        if (staffIndex === -1) {
            return res.status(404).json({ error: "Staff member not found." });
        }
        const staffToDelete = store_js_1.staffMembers[staffIndex];
        // Find associated user credentials
        const userIndex = store_js_1.users.findIndex((u) => u.email.toLowerCase() === staffToDelete.email.toLowerCase() || u.fullName.toLowerCase() === staffToDelete.fullName.toLowerCase());
        // Protection rule: Cannot delete primary super administrator
        if ((userIndex !== -1 && (store_js_1.users[userIndex].username === "superadmin" || store_js_1.users[userIndex].id === "usr-admin-01")) ||
            staffToDelete.email.toLowerCase() === "namal.kumara@apexcare.lk") {
            return res.status(400).json({
                error: "The primary Super Administrator account cannot be deleted as it is required for hospital governance.",
            });
        }
        // Remove from staffMembers array
        store_js_1.staffMembers.splice(staffIndex, 1);
        let deletedUsername = "";
        if (userIndex !== -1) {
            deletedUsername = store_js_1.users[userIndex].username;
            store_js_1.users.splice(userIndex, 1);
        }
        // Clean up associated leave records
        const initialLeaveCount = store_js_1.leaveRecords.length;
        for (let i = store_js_1.leaveRecords.length - 1; i >= 0; i--) {
            if (store_js_1.leaveRecords[i].employeeId === staffToDelete.id || store_js_1.leaveRecords[i].employeeName === staffToDelete.fullName) {
                store_js_1.leaveRecords.splice(i, 1);
            }
        }
        (0, store_js_1.saveStorage)();
        (0, realtime_service_js_1.notifyChange)("staff", "delete", staffToDelete);
        (0, store_js_1.logAudit)("STAFF_DELETED", "StaffMember", staffToDelete.id, req.user?.id || "usr-admin-01", req.ip);
        return res.json({
            success: true,
            message: `Staff member "${staffToDelete.fullName}" (${staffToDelete.employeeId}) and station credentials "${deletedUsername}" were successfully deleted.`,
            deletedId: staffToDelete.id,
            deletedEmployeeId: staffToDelete.employeeId,
        });
    }
    catch (err) {
        console.error("Staff deletion failed:", err);
        return res.status(500).json({ error: "Failed to delete staff member." });
    }
});
