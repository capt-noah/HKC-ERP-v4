import bcrypt from "bcrypt"
import { createRow } from "./server/db/supabaseClient.js"

async function seedSuperAdmin() {
  console.log("Seeding initial superadmin user...")
  const username = "admin"
  const password = "admin" // For testing

  
  try {
    const password_hash = await bcrypt.hash(password, 10)
    
    const response = await createRow({
      resource: { table: "users", storage: "direct" },
      body: { 
        username, 
        password_hash, 
        role: "superadmin" 
      },
    })
    
    if (response.status >= 400) {
      if (JSON.stringify(response.body).includes("duplicate key")) {
        console.log("Superadmin already exists.")
      } else {
        console.error("Failed to seed superadmin:", response.body)
      }
    } else {
      console.log("Superadmin seeded successfully! Username: admin | Password: SuperadminPassword1!")
    }
  } catch (err) {
    console.error("Error seeding auth:", err)
  }
}

seedSuperAdmin()
