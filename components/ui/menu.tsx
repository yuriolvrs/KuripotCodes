import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "./button";

interface MenuOption {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}

interface MenuGroup {
  label: string;
  options: MenuOption[];
}

interface MenuProps {
  groups: MenuGroup[];
  trigger?: React.ReactNode;
}

export function Menu({ groups, trigger = "Menu" }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
        title="Toggle options"
      >
        {trigger}
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border bg-white shadow-lg">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.label && (
                <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                  {group.label}
                </div>
              )}
              <div className="py-1">
                {group.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    onClick={() => {
                      option.onClick();
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    <span>{option.label}</span>
                    {option.active && <Check className="size-4 text-green-600" />}
                  </button>
                ))}
              </div>
              {groupIndex < groups.length - 1 && <div className="border-t" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
