
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";

import {
  aiProvidersApi,
  type AiProviderType,
  type CatalogModel,
} from "@/lib/ai-providers-api";
import { useUiLanguage } from "@/lib/ui-language";

interface Props {
  provider?: AiProviderType;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ModelPicker({
  provider,
  value,
  onChange,
  disabled,
}: Props) {
  const { t } = useUiLanguage();

  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!provider) {
      setModels([]);
      setError(false);
      setLoading(false);
      return;
    }

    let alive = true;

    setLoading(true);
    setError(false);
    setModels([]);

    void aiProvidersApi
      .listCatalogModels(provider)
      .then((items) => {
        if (alive) setModels(items);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [provider, revision]);

  const selected = useMemo(
    () => models.find((item) => item.id === value),
    [models, value],
  );

  const label = !provider
    ? t.chooseConnection
    : loading
      ? t.loadingModels
      : error
        ? t.modelError
        : selected
          ? selected.name
          : value
            ? value
            : models.length === 0
              ? t.noModelsAvailable
              : t.chooseModel;

  return (
    <div className="min-w-0 space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={
              disabled ||
              !provider ||
              loading ||
              error ||
              models.length === 0
            }
            className="w-full min-w-0 justify-between font-normal text-foreground"
          >
            <span className="min-w-0 truncate text-left">
              {label}
            </span>

            {loading ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.toLowerCase())
                ? 1
                : 0
            }
          >
            <CommandInput placeholder={t.searchModel} />

            <CommandList className="max-h-72">
              <CommandEmpty>{t.noModel}</CommandEmpty>

              {models.map((model) => (
                <CommandItem
                  key={model.id}
                  value={`${model.name} ${model.id}`}
                  onSelect={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`size-4 shrink-0 ${
                      value === model.id
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />

                  <span className="min-w-0">
                    <span className="block truncate">
                      {model.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {model.id}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {provider && !loading && !error && (
        <p className="text-xs text-muted-foreground">
          {models.length} {t.modelCount}
        </p>
      )}

      {value && !loading && !error && !selected && (
        <p className="text-xs text-muted-foreground">
          {t.currentModel}: {value}
        </p>
      )}

      {error && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRevision((n) => n + 1)}
        >
          {t.retry}
        </Button>
      )}
    </div>
  );
}
