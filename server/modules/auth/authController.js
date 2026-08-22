import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { listRows, createRow } from "../../db/supabaseClient.js"
import { logActivity } from "../common/activityLogger.js"

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only"

const USERS_RESOURCE = { table: "users", storage: "direct" }

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

export async function login(req, res) {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" })
  }

  try {
    // Find user
    const response = await listRows({
      resource: USERS_RESOURCE,
      query: { username: `eq.${username}`, limit: 1 },
    })

    if (response.status !== 200 || !response.body || response.body.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const user = response.body[0]

    // Check suspension status
    if (user.status === "suspended") {
      return res.status(403).json({ error: "Your account is suspended. Please contact the administrator." })
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Generate JWT (30 days expiration)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: user.roles || [],
        fullname: user.fullname || "",
        warehouse_ids: user.warehouse_ids || [],
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    )

    // Log login activity asynchronously
    logActivity(
      user.id,
      user.username,
      user.fullname || "",
      "Login",
      "auth",
      { ip: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").split(",")[0].trim() }
    ).catch(err => console.error("[AUTH LOGIN LOG ERROR]", err.message))

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles || [],
        fullname: user.fullname || "",
        warehouse_ids: user.warehouse_ids || [],
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
    const response = await listRows({
      resource: USERS_RESOURCE,
      query: { id: `eq.${userId}`, limit: 1 },
    })

    if (response.status !== 200 || !response.body || response.body.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const u = response.body[0]
    res.status(200).json({
      id: u.id,
      username: u.username,
      roles: u.roles || [],
      fullname: u.fullname || "",
      status: u.status || "active",
      employee_id: u.employee_id || null,
      warehouse_ids: u.warehouse_ids || (u.warehouse_id ? [u.warehouse_id] : []),
      created_at: u.created_at,
      updated_at: u.updated_at,
    })
  } catch (error) {
    console.error("getCurrentUser error:", error)
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
}

export async function updateCurrentUserProfile(req, res) {
  try {
    const userId = req.user.id
    const { fullname, password } = req.body

    const updateBody = {}
    if (fullname !== undefined) updateBody.fullname = fullname
    if (password) {
      updateBody.password_hash = await bcrypt.hash(password, 10)
    }

    const { updateRow } = await import("../../db/supabaseClient.js")
    const response = await updateRow({
      resource: USERS_RESOURCE,
      id: userId,
      body: updateBody,
    })

    if (response.status >= 400) {
      return res.status(response.status).json(response.body)
    }

    res.status(200).json({ message: "Profile updated successfully", user: response.body })
  } catch (error) {
    console.error("updateCurrentUserProfile error:", error)
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
}

export async function register(req, res) {
  const { username, password, roles, status, fullname, employee_id, warehouse_ids } = req.body

  if (!username || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: "Username, password, and at least one role are required" })
  }

  const validRoles = ["superadmin", "sales_manager", "hr_manager", "inventory_admin", "finance_manager", "hkc_docs_manager"]
  const hasInvalidRole = roles.some(role => !validRoles.includes(role))
  if (hasInvalidRole) {
    return res.status(400).json({ error: "One or more invalid roles specified" })
  }

  try {
    const password_hash = await bcrypt.hash(password, 10)

    const response = await createRow({
      resource: USERS_RESOURCE,
      body: { 
        username, 
        password_hash, 
        roles, 
        status: status || "active", 
        fullname: fullname || "", 
        employee_id: employee_id || null, 
        warehouse_ids: warehouse_ids || [] 
      },
    })

    if (response.status >= 400) {
      return res.status(response.status).json(response.body)
    }

    res.status(201).json({ message: "User created successfully" })
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
}
