'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search, School } from "lucide-react";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { API_ENDPOINTS } from '@/lib/api-config';


interface School {
    _id: string;
    name: string;
}

interface SchoolSearchInputProps {
    value: string;
    onSelect: (schoolName: string) => void;
    disabled?: boolean;
}

export function SchoolSearchInput({ value, onSelect, disabled }: SchoolSearchInputProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [schools, setSchools] = React.useState<School[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    // Debounce query to prevent too many API calls
    React.useEffect(() => {
        // Clear previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Don't search if query too short
        if (query.length < 2) {
            setSchools([]);
            setError(null);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);

            // Create new AbortController
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            try {
                const res = await fetch(
                    API_ENDPOINTS.SCHOOLS.SEARCH(query),
                    { signal: abortController.signal }
                );

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }

                const data = await res.json();
                setSchools(Array.isArray(data) ? data : []);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Error fetching schools:', err);
                    setError('ไม่สามารถค้นหาโรงเรียนได้');
                    setSchools([]);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [query]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between pl-10 h-11 rounded-xl bg-gray-50 border-gray-200 hover:bg-white hover:border-pink-500 hover:ring-2 hover:ring-pink-500/20 text-left font-normal border-l-4 border-l-pink-500 transition-all relative"
                >
                    <School className="absolute left-3 top-3 h-5 w-5 text-pink-500 z-10" />
                    {value ? (
                        <span className="truncate">
                            {value}
                        </span>
                    ) : (
                        <span className="text-muted-foreground opacity-50">
                            พิมพ์ชื่อโรงเรียน...
                        </span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="พิมพ์ชื่อโรงเรียน..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList className="max-h-[250px] overflow-y-auto touch-pan-y">
                        {loading && (
                            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังค้นหา...
                            </div>
                        )}
                        {error && (
                            <div className="py-4 text-center text-sm text-red-500">
                                {error}
                            </div>
                        )}
                        {!loading && !error && schools.length === 0 && query.length >= 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                ไม่พบโรงเรียนที่ระบุ
                            </div>
                        )}
                        {!loading && !error && (
                            <CommandGroup heading="ผลการค้นหา">
                                {schools.map((school) => (
                                    <CommandItem
                                        key={school._id}
                                        value={school.name}
                                        onSelect={(currentValue) => {
                                            console.log('Selected:', school.name);
                                            onSelect(school.name);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer py-3 px-2 aria-selected:bg-primary/10 aria-selected:text-primary"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === school.name ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {school.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
