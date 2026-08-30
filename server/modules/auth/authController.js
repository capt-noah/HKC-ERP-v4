import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { db } from "../../db/client.js"
import { users } from "../../db/schema/index.js"
import { eq } from "drizzle-orm"
import { logActivity } from "../common/activityLogger.js"
import crypto from "node:crypto"

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only"

export async function login(req, res) {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" })
  }

  try {
    // Find user via Drizzle
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const user = rows[0]

    // Check active status
    if (user.isActive === false) {
      return res.status(403).json({ error: "Your account is deactivated. Please contact the administrator." })
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const fullname = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username
    const roles = [user.role]

    // Generate JWT (30 days expiration)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles,
        fullname,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    )

    // Log login activity asynchronously
    logActivity(
      user.id,
      user.username,
      fullname,
      "Login",
      "auth",
      { ip: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").split(",")[0].trim() }
    ).catch(err => console.error("[AUTH LOGIN LOG ERROR]", err.message))

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        roles,
        role: user.role,
        fullname,
        first_name: user.firstName,
        last_name: user.lastName,
      },
    })
  } catch (error) {
    console.error("Auth login controller error:", error)
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
}

export async function getCurrentUser(req, res) {
  try {
    const userId = req.user.id
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const u = rows[0]
    const fullname = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username

    res.status(200).json({
      id: u.id,
      username: u.username,
      roles: [u.role],
      role: u.role,
      fullname,
      first_name: u.firstName,
      last_name: u.lastName,
      status: u.isActive ? "active" : "inactive",
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    })
  } catch (error) {
    console.error("getCurrentUser error:", error)
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
}

export async function updateCurrentUserProfile(req, res) {
  try {
    const userId = req.user.id
    const { fullname, firstName, lastName, password } = req.body

    const updateBody = {
      updatedAt: new Date(),
    }

    if (firstName !== undefined) updateBody.firstName = firstName
    if (lastName !== undefined) updateBody.lastName = lastName
    if (fullname && !firstName && !lastName) {
      const parts = fullname.split(" ")
      updateBody.firstName = parts[0] || ""
      updateBody.lastName = parts.slice(1).join(" ") || ""
    }
    if (password) {
      updateBody.passwordHash = await bcrypt.hash(password, 10)
    }

    const updated = await db
      .update(users)
      .set(updateBody)
      .where(eq(users.id, userId))
      .returning()

    if (updated.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.status(200).json({ message: "Profile updated successfully", user: updated[0] })
  } catch (error) {
    console.error("updateCurrentUserProfile error:", error)
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
}

export async function register(req, res) {
  const { username, password, roles, role, status, fullname, firstName, lastName } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" })
  }

  const assignedRole = role || (Array.isArray(roles) && roles.length > 0 ? roles[0] : "viewer")

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const id = `USR-${crypto.randomUUID().slice(0, 8)}`

    let fName = firstName || ""
    let lName = lastName || ""
    if (fullname && !fName && !lName) {
      const parts = fullname.split(" ")
      fName = parts[0] || ""
      lName = parts.slice(1).join(" ") || ""
    }

    await db.insert(users).values({
      id,
      username,
      passwordHash,
      role: assignedRole,
      firstName: fName,
      lastName: lName,
      isActive: status !== "inactive" && status !== "suspended",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    res.status(201).json({ message: "User created successfully", id })
  } catch (error) {
    console.error("Register error:", error)
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
}
