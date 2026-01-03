'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const t = useTranslations()
  const { toast } = useToast()
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      // Valider le token
      validateToken(tokenParam)
    } else {
      setIsValidating(false)
      setIsValidToken(false)
    }
  }, [searchParams])

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch(`/api/auth/validate-reset-token?token=${tokenToValidate}`)
      const data = await response.json()
      
      if (data.success) {
        setIsValidToken(true)
      } else {
        setIsValidToken(false)
        toast({
          title: t('auth.invalidToken'),
          description: data.message || t('auth.invalidTokenDescription'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      setIsValidToken(false)
      toast({
        title: t('common.error'),
        description: t('auth.connectionError'),
        variant: 'destructive',
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('auth.fillAllFields'),
        variant: 'destructive',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatch'),
        description: t('auth.passwordMismatchDescription'),
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: t('auth.passwordTooShort'),
        description: t('auth.passwordTooShortDescription'),
        variant: 'destructive',
      })
      return
    }

    if (!token) {
      toast({
        title: t('auth.invalidToken'),
        description: t('auth.invalidTokenDescription'),
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t('auth.passwordResetSuccess'),
          description: t('auth.passwordResetSuccessDescription'),
        })
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          router.push(`/${locale}/login`)
        }, 2000)
      } else {
        toast({
          title: t('auth.passwordResetError'),
          description: data.message || data.error || t('auth.passwordResetErrorMessage'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.connectionError'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">{t('auth.validatingToken')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth.invalidToken')}</CardTitle>
            <CardDescription>
              {t('auth.invalidTokenDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/forgot-password`}>
              <Button className="w-full">
                {t('auth.requestNewToken')}
              </Button>
            </Link>
            <Link href={`/${locale}/login`}>
              <Button variant="ghost" className="w-full mt-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
          <CardDescription>
            {t('auth.resetPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.newPassword')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.newPasswordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                {t('auth.passwordMinLength')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.resettingPassword')}
                </>
              ) : (
                t('auth.resetPasswordButton')
              )}
            </Button>
            <Link href={`/${locale}/login`}>
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

