import express from "express"
import { login, register } from "./authController.js"
import { authenticateToken, authorizeRoles } from "./authMiddleware.js"

const authRouter = express.Router()

authRouter.post("/login", login)
// Only superadmins can register new users
authRouter.post("/register", authenticateToken, authorizeRoles("superadmin"), register)

export { authRouter }
