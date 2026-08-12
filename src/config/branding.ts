import rawBranding from '../../branding.json'

export interface AppBranding {
  displayName: string
  description: string
  notificationTitle: string
  artifactName: string
}

function requireBrandingText(key: keyof AppBranding): string {
  const value = rawBranding[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`branding.json 中的 ${key} 必须是非空字符串`)
  }
  return value.trim()
}

export const appBranding: AppBranding = {
  displayName: requireBrandingText('displayName'),
  description: requireBrandingText('description'),
  notificationTitle: requireBrandingText('notificationTitle'),
  artifactName: requireBrandingText('artifactName')
}
