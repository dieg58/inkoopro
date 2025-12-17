const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123' // À changer en production

export function verifyAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD
}

