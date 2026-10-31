
"use client";

import Bowser from "bowser";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MonitorIcon,
} from "lucide-react";

import {
  conversationsApi,
  type ContactSession,
} from "@/lib/conversations-api";

import {
  getCountryFlagUrl,
  getCountryFromTimezone,
} from "@/lib/country-utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";

import { Button } from "@workspace/ui/components/button";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";

type InfoItem = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

type InfoSection = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: InfoItem[];
};

export const ContactPanel = () => {
  const params = useParams();
  const conversationId =
    typeof params.conversationId === "string"
      ? params.conversationId
      : null;

  const [contactSession, setContactSession] =
    useState<ContactSession | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setContactSession(null);
    setError(null);
    setLoading(true);

    if (!conversationId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    conversationsApi
      .getContactSessionByConversation(conversationId)
      .then((result) => {
        if (active) {
          setContactSession(result);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load contact",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [conversationId]);

  const userAgentInfo = useMemo(() => {
    const userAgent = contactSession?.metadata?.userAgent;

    if (!userAgent) {
      return {
        browser: "Unknown",
        browserVersion: "",
        os: "Unknown",
        osVersion: "",
        device: "Unknown",
        deviceModel: "",
      };
    }

    const result = Bowser.getParser(userAgent).getResult();

    return {
      browser: result.browser.name ?? "Unknown",
      browserVersion: result.browser.version ?? "",
      os: result.os.name ?? "Unknown",
      osVersion: result.os.version ?? "",
      device: result.platform.type ?? "desktop",
      deviceModel: result.platform.model ?? "",
    };
  }, [contactSession?.metadata?.userAgent]);

  const countryInfo = useMemo(
    () =>
      getCountryFromTimezone(
        contactSession?.metadata?.timezone,
      ),
    [contactSession?.metadata?.timezone],
  );

  const accordionSections = useMemo<InfoSection[]>(() => {
    if (!contactSession?.metadata) {
      return [];
    }

    const metadata = contactSession.metadata;

    return [
      {
        id: "device-info",
        icon: MonitorIcon,
        title: "Device Information",
        items: [
          {
            label: "Browser",
            value: [
              userAgentInfo.browser,
              userAgentInfo.browserVersion,
            ]
              .filter(Boolean)
              .join(" "),
          },
          {
            label: "OS",
            value: [
              userAgentInfo.os,
              userAgentInfo.osVersion,
            ]
              .filter(Boolean)
              .join(" "),
          },
          {
            label: "Device",
            value: [
              userAgentInfo.device,
              userAgentInfo.deviceModel,
            ]
              .filter(Boolean)
              .join(" - "),
            className: "capitalize",
          },
          {
            label: "Screen",
            value: metadata.screenResolution ?? "Unknown",
          },
          {
            label: "Viewport",
            value: metadata.viewportSize ?? "Unknown",
          },
          {
            label: "Cookies",
            value:
              metadata.cookieEnabled === undefined
                ? "Unknown"
                : metadata.cookieEnabled
                  ? "Enabled"
                  : "Disabled",
          },
        ],
      },
      {
        id: "location-info",
        icon: GlobeIcon,
        title: "Location & Language",
        items: [
          ...(countryInfo
            ? [
                {
                  label: "Country",
                  value: countryInfo.name,
                },
              ]
            : []),
          {
            label: "Language",
            value: metadata.language ?? "Unknown",
          },
          {
            label: "Timezone",
            value: metadata.timezone ?? "Unknown",
          },
          {
            label: "UTC Offset",
            value:
              metadata.timezoneOffset === undefined
                ? "Unknown"
                : String(metadata.timezoneOffset),
          },
        ],
      },
      {
        id: "session-details",
        icon: ClockIcon,
        title: "Session Details",
        items: [
          {
            label: "Session Started",
            value: new Date(
              contactSession.createdAt,
            ).toLocaleString(),
          },
          {
            label: "Session Expires",
            value: new Date(
              contactSession.expiresAt,
            ).toLocaleString(),
          },
        ],
      },
    ];
  }, [contactSession, userAgentInfo, countryInfo]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading contact...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!contactSession) {
    return null;
  }

  const contactName = contactSession.name?.trim() || "Khách truy cập";
  const contactEmail = contactSession.email?.trim() || null;

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="flex flex-col gap-y-4 p-4">
        <div className="flex items-center gap-x-2">
          <DicebearAvatar
            badgeImageUrl={
              countryInfo?.code
                ? getCountryFlagUrl(countryInfo.code)
                : undefined
            }
            seed={contactSession.id}
            size={42}
          />

          <div className="flex-1 overflow-hidden">
            <h4 className="line-clamp-1">
              {contactName}
            </h4>

            <p className="line-clamp-1 text-sm text-muted-foreground">
              {contactEmail ?? "Chưa cung cấp email"}
            </p>
          </div>
        </div>

        {contactEmail && (
          <Button asChild className="w-full" size="lg">
            <Link href={`mailto:${contactEmail}`}>
              <MailIcon />
              <span>Send Email</span>
            </Link>
          </Button>
        )}
      </div>

      {contactSession.metadata && (
        <Accordion
          className="w-full rounded-none border-y"
          collapsible
          type="single"
        >
          {accordionSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="rounded-none outline-none has-focus-visible:z-10 has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
            >
              <AccordionTrigger className="flex w-full flex-1 items-start justify-between gap-4 rounded-none bg-accent px-5 py-4 text-left font-medium text-sm outline-none transition-all hover:no-underline">
                <div className="flex items-center gap-4">
                  <section.icon className="size-4 shrink-0" />
                  <span>{section.title}</span>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-5 py-4">
                <div className="space-y-2 text-sm">
                  {section.items.map((item) => (
                    <div
                      key={`${section.id}-${item.label}`}
                      className="flex justify-between gap-3"
                    >
                      <span className="shrink-0 text-muted-foreground">
                        {item.label}:
                      </span>

                      <span
                        className={`min-w-0 break-words text-right ${item.className ?? ""}`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};
