'use client';

import { ChevronsUpDown, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * A text field that offers the values already in use (the old <datalist>) and
 * takes a new one: Popover + Command. Used for department and level.
 */
export function ValueCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
}) {
  const t = useTranslations('jobs.editor.combo');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const term = search.trim();
  const values = value && !options.includes(value) ? [value, ...options] : options;
  const isNew = term !== '' && !values.some((v) => v.toLowerCase() === term.toLowerCase());

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid || undefined}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm outline-hidden transition-colors',
            'focus-visible:border-blue-600 aria-expanded:border-blue-600 data-invalid:border-red-400',
          )}
        >
          <span className={cn('truncate', !value && 'text-gray-400')}>{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <Command>
          <CommandInput value={search} onValueChange={setSearch} placeholder={t('search')} />
          <CommandList>
            <CommandEmpty className="py-4 text-gray-400">{t('empty')}</CommandEmpty>
            {isNew && (
              <CommandGroup forceMount>
                <CommandItem forceMount value={`__new__${term}`} onSelect={() => choose(term)}>
                  <Plus className="text-blue-600" />
                  {t('use', { value: term })}
                </CommandItem>
              </CommandGroup>
            )}
            {values.length > 0 && (
              <CommandGroup heading={t('inUse')}>
                {values.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    data-checked={option === value}
                    onSelect={() => choose(option)}
                  >
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value && !term && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="__clear__" onSelect={() => choose('')} className="text-gray-500">
                    <X />
                    {t('clear')}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
