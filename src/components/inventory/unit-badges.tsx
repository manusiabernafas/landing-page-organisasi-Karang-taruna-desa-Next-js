import { Badge } from "@/components/ui/badge";
import { CONDITION, UNIT_STATUS } from "@/lib/utils/labels";
import type { ItemCondition, UnitStatus } from "@/types/db";

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const s = UNIT_STATUS[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function ConditionBadge({ condition }: { condition: ItemCondition }) {
  const c = CONDITION[condition];
  return <Badge tone={c.tone}>Kondisi: {c.label}</Badge>;
}
