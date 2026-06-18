import { useRef, useState, useEffect } from 'react'
import type { FamilyMember } from '../types'
import type { FamilyGraph } from '../utils/relationships'
import { cardDisplayName, lifespan, type CardDisplayRole } from '../utils/family'
import { MemberAvatar } from './MemberAvatar'
import { PersonCardHoverDetails } from './PersonCardHoverDetails'

interface PersonCardProps {
  member: FamilyMember
  graph?: FamilyGraph
  displayRole?: CardDisplayRole
  selected?: boolean
  expanded?: boolean
  compact?: boolean
  showBirthPlace?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
}

const MAX_TILT = 11

export function PersonCard({
  member,
  graph,
  displayRole,
  selected,
  expanded,
  compact,
  showBirthPlace = true,
  onClick,
  onDoubleClick,
}: PersonCardProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [lifted, setLifted] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const life = lifespan(member)
  const genderClass =
    member.gender === 'male'
      ? 'person-card-face-male'
      : member.gender === 'female'
        ? 'person-card-face-female'
        : ''

  const onPointerMove = (e: React.PointerEvent) => {
    if (compact || reduceMotion || hovering) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({
      x: py * -MAX_TILT,
      y: px * MAX_TILT,
    })
  }

  const resetTilt = () => {
    setTilt({ x: 0, y: 0 })
    setLifted(false)
    setHovering(false)
  }

  const liftZ = expanded ? 22 : selected ? 18 : hovering ? 24 : lifted ? 14 : 0
  const transform =
    compact || reduceMotion
      ? undefined
      : hovering
        ? `perspective(900px) translateZ(${liftZ}px) scale(1.04)`
        : `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${liftZ}px)`

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerMove={onPointerMove}
      onPointerEnter={() => {
        setLifted(true)
        if (!compact) setHovering(true)
      }}
      onPointerLeave={resetTilt}
      style={{ transform }}
      className={`person-card-3d ${hovering ? 'is-hovering' : ''} ${selected ? 'selected' : ''} ${expanded ? 'expanded-branch' : ''} ${compact ? 'person-card-3d-compact' : ''}`}
    >
      <span
        className={`person-card-face ${genderClass} ${lifted || selected || expanded || hovering ? 'lifted' : ''} ${hovering ? 'is-expanded' : ''}`}
      >
        <span className="person-card-edge" aria-hidden="true" />
        <span className="person-card-shine" aria-hidden="true" />
        <span className="person-card-content">
          <span className="flex items-start gap-2.5">
            <MemberAvatar member={member} size="md" className="avatar-ring avatar-ring-3d" />
            <span className="min-w-0 flex-1">
              <span className="person-card-name block leading-tight">
                {cardDisplayName(member, displayRole)}
              </span>
              {life && (
                <span className="person-card-meta mt-0.5 block">
                  {life}
                </span>
              )}
              {member.birthPlace && showBirthPlace && !compact && !hovering && (
                <span className="person-card-place mt-0.5 block truncate">
                  {member.birthPlace}
                </span>
              )}
            </span>
          </span>

          {!compact && (
            <PersonCardHoverDetails
              member={member}
              displayRole={displayRole}
              graph={graph}
            />
          )}
        </span>
      </span>
    </button>
  )
}
