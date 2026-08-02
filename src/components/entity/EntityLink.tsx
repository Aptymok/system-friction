import Link from "next/link";
import type { SfiEntityType } from "@/core/contracts";
import { buildEntityHref } from "@/lib/entity/entityNavigation";

type EntityLinkProps = {
  entityId?: string | null;
  entityType?: SfiEntityType | string | null;
  label?: string;
  className?: string;
  showType?: boolean;
  compact?: boolean;
};

export function EntityLink({
  entityId,
  entityType,
  label,
  className,
  showType = true,
  compact = false,
}: EntityLinkProps) {
  const href = buildEntityHref(entityId, entityType);
  const displayId = typeof entityId === "string" && entityId.trim() ? entityId.trim() : "NO_ENTITY";
  const displayType = typeof entityType === "string" && entityType.trim() ? entityType.trim() : "UNKNOWN_TYPE";
  const content = (
    <>
      {showType ? <span>{displayType}</span> : null}
      <code>{label ?? (compact ? compactId(displayId) : displayId)}</code>
    </>
  );

  if (!href) {
    return (
      <span className={className} data-entity-link="unavailable" aria-label={`Entity link unavailable for ${displayType} ${displayId}`}>
        {content}
      </span>
    );
  }

  return (
    <Link className={className} href={href} data-entity-link="true" aria-label={`Open ${displayType} entity ${displayId}`}>
      {content}
    </Link>
  );
}

function compactId(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}
