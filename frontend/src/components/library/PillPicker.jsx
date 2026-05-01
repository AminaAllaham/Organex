import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PillPicker({
  items,
  selectedIds,
  onChange,
  emptyMessage = 'Nothing to choose from yet.',
  placeholder = 'Add…',
}) {
  // Force-remount the Select after each pick so the trigger resets to the
  // placeholder instead of showing the just-picked item.
  const [selectKey, setSelectKey] = useState(0)

  const selectedItems = items.filter((i) => selectedIds.includes(i.id))
  const availableItems = items.filter((i) => !selectedIds.includes(i.id))

  function add(id) {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id])
    setSelectKey((k) => k + 1)
  }

  function remove(id) {
    onChange(selectedIds.filter((x) => x !== id))
  }

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className="space-y-3">
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-0.5 pl-3 pr-1 text-sm"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color || '#94a3b8' }}
                aria-hidden
              />
              {item.name}
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${item.name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {availableItems.length > 0 ? (
        <Select key={selectKey} onValueChange={add}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {availableItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color || '#94a3b8' }}
                    aria-hidden
                  />
                  {item.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-xs text-muted-foreground">
          All items added.
        </p>
      )}
    </div>
  )
}
