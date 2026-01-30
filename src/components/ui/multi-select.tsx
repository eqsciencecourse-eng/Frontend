"use client";

import * as React from "react";
import { X, ChevronsUpDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type OptionType = {
    label: string;
    value: string;
};

interface MultiSelectProps {
    options: OptionType[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select items...",
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item));
    };

    const handleSelect = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((item) => item !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between hover:bg-background/90 h-auto min-h-10 py-2",
                        className
                    )}
                >
                    <div className="flex flex-wrap gap-1">
                        {selected.length === 0 && (
                            <span className="text-muted-foreground font-normal">
                                {placeholder}
                            </span>
                        )}
                        {selected.map((item) => (
                            <Badge
                                variant="secondary"
                                key={item}
                                className="mr-1 mb-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnselect(item);
                                }}
                            >
                                {options.find((option) => option.value === item)?.label || item}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleUnselect(item);
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleUnselect(item);
                                    }}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </div>
                            </Badge>
                        ))}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-white shadow-lg border border-slate-200 z-[9999]">
                <div className="p-2 border-b border-slate-100">
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 border-none focus-visible:ring-0 bg-transparent"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                    {filteredOptions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No item found.
                        </div>
                    ) : (
                        filteredOptions.map((option) => {
                            const isSelected = selected.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 transition-colors",
                                        isSelected && "bg-slate-100"
                                    )}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <div className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                    )}>
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <span>{option.label}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
