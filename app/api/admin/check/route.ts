import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('admin-auth')
    const isAuthenticated = authCookie?.value === 'true'
    return NextResponse.json({
      authenticated: isAuthenticated,
    })
  } catch (error) {
    console.error('Erreur API admin check:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

