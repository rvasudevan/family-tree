import { useState } from 'react'
import type { FamilyMember } from '../types'
import { avatarEmoji } from '../utils/family'

type AvatarSize = 'sm' | 'md' | 'lg'

interface MemberAvatarProps {
  member: FamilyMember
  size?: AvatarSize
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'member-avatar-sm',
  md: 'member-avatar-md',
  lg: 'member-avatar-lg',
}

export function MemberAvatar({ member, size = 'md', className = '' }: MemberAvatarProps) {
  const sizeClass = sizeClasses[size]
  const [photoFailed, setPhotoFailed] = useState(false)
  const photoUrl = member.avatarUrl

  if ((photoUrl?.startsWith('/') || photoUrl?.startsWith('http')) && !photoFailed) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`member-avatar-photo ${sizeClass} ${className}`}
        onError={() => setPhotoFailed(true)}
      />
    )
  }

  return (
    <span className={`member-avatar-emoji ${sizeClass} ${className}`} aria-hidden="true">
      {avatarEmoji(member)}
    </span>
  )
}
