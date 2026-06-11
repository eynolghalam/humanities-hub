'use client';

import * as React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { themeNames, type ThemeName } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';

export function ThemeSwitcher() {
  const { currentTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="تغییر تم"
          aria-label="تغییر تم"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>انتخاب تم</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeNames.map((theme) => (
          <DropdownMenuItem
            key={theme.name}
            onClick={() => setTheme(theme.name as ThemeName)}
            className={currentTheme === theme.name ? 'bg-accent' : ''}
          >
            <span className="mr-2">{theme.emoji}</span>
            {theme.label}
            {currentTheme === theme.name && (
              <span className="ml-auto">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
