"use client";

import {
  AccountSettingIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  KeyIcon,
  Logout03Icon,
  Moon02Icon,
  Notification01Icon,
  Sun03Icon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { motion } from "framer-motion";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { ScrollArea } from "@/components/scroll-area";
import { UserAvatar } from "@/components/user-avatar";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Currency = "USD" | "EUR" | "GBP";

type Note = { text: string; ok: boolean };

type Prefs = {
  orderUpdates: boolean;
  priceDrops: boolean;
  productPicks: boolean;
  currency: Currency;
};

type SectionId = "profile" | "preferences" | "notifications" | "password";

const DEFAULT_PREFS: Prefs = {
  orderUpdates: true,
  priceDrops: true,
  productPicks: false,
  currency: "USD",
};

const PREFS_KEY = "avelor:preferences";

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
];

const SECTIONS: { id: SectionId; label: string; icon: IconSvgElement }[] = [
  { id: "profile", label: "Profile", icon: UserAccountIcon },
  { id: "preferences", label: "Preferences", icon: AccountSettingIcon },
  { id: "notifications", label: "Notifications", icon: Notification01Icon },
  { id: "password", label: "Password", icon: KeyIcon },
];

const INPUT_CLASS = cn(
  "h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground",
  "placeholder:text-subtle transition-colors duration-150 ease-expo",
  "focus:border-brand-blue/50 focus:outline-none dark:focus:border-brand-blue/60"
);

const SAVE_CLASS = cn(
  "btn-brand flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold",
  "disabled:opacity-50",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
);

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
};

export function SettingsModal({ open, onClose, onSignIn }: SettingsModalProps) {
  const { data: session } = useSession();
  const user = session?.user ?? null;

  const [section, setSection] = useState<SectionId>("profile");

  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNote, setProfileNote] = useState<Note | null>(null);

  const [night, setNight] = useState(false);
  const [saved, setSaved] = useState<Prefs | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNote, setPasswordNote] = useState<Note | null>(null);

  const prefs = saved ?? DEFAULT_PREFS;

  // Re-read on every open: the document theme and stored choices can change
  // while the modal is closed, and the session arrives after first render.
  useEffect(() => {
    if (!open) return;
    setNight(document.documentElement.classList.contains("dark"));
    setSaved(readPrefs());
    setSection("profile");
    setProfileNote(null);
    setPasswordNote(null);
  }, [open]);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Only writes once the stored value has been read back, so the first render
  // cannot overwrite last session's choices with the defaults.
  useEffect(() => {
    if (!saved || !open) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(saved));
    } catch {
      // storage unavailable — preferences just won't persist
    }
  }, [saved, open]);

  if (!open) return null;

  function chooseTheme(next: boolean) {
    setNight(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("avelor-theme", next ? "night" : "day");
    } catch {
      // storage unavailable — theme just won't persist
    }
  }

  function patch(next: Partial<Prefs>) {
    setSaved((current) => ({ ...(current ?? DEFAULT_PREFS), ...next }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileNote(null);
    const result = await authClient.updateUser({ name });
    setSavingProfile(false);
    if (result.error) {
      setProfileNote({ text: result.error.message ?? "Could not save your details.", ok: false });
      return;
    }
    setProfileNote({ text: "Saved", ok: true });
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (savingPassword) return;
    setSavingPassword(true);
    setPasswordNote(null);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSavingPassword(false);
    if (result.error) {
      setPasswordNote({
        text: result.error.message ?? "Could not change your password.",
        ok: false,
      });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPasswordNote({ text: "Password updated", ok: true });
  }

  async function signOut() {
    await authClient.signOut();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/25 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative flex h-[min(78dvh,520px)] w-full max-w-[760px] overflow-hidden rounded-[32px]",
          "border border-white/50 bg-white/40 shadow-pop backdrop-blur-2xl",
          "dark:border-white/10 dark:bg-[#15182b]/70"
        )}
      >
        {user ? (
          <div className="flex min-h-0 w-full">
            <aside className="flex w-[216px] shrink-0 flex-col gap-1 border-r border-border/70 bg-white/25 p-3 dark:bg-white/5">
              <div className="flex min-w-0 items-center gap-3 px-1.5 pb-3">
                <UserAvatar name={user.name} image={user.image} size="md" />
                <div className="min-w-0 flex-1 max-sm:hidden">
                  <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>

              {SECTIONS.map((item) => {
                const active = item.id === section;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    title={item.label}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-3 rounded-xl px-2.5 text-sm font-medium",
                      "transition-colors duration-150 ease-expo max-sm:justify-center max-sm:px-0",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
                      active
                        ? "bg-brand-wash text-brand-blue"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      size={18}
                      strokeWidth={1.8}
                      className="shrink-0"
                    />
                    <span className="truncate max-sm:hidden">{item.label}</span>
                  </button>
                );
              })}

              <div className="min-h-0 flex-1" />
              <button
                type="button"
                onClick={signOut}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm font-medium text-muted",
                  "transition-colors duration-150 ease-expo hover:bg-surface-hover hover:text-foreground",
                  "max-sm:justify-center max-sm:px-0",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                )}
              >
                <HugeiconsIcon
                  icon={Logout03Icon}
                  size={18}
                  strokeWidth={1.8}
                  className="shrink-0"
                />
                <span className="max-sm:hidden">Sign out</span>
              </button>
            </aside>

            <div className="relative flex min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 justify-end px-2 pt-2">
                <IconButton
                  label="Close settings"
                  onClick={onClose}
                  className="size-9 border border-white/50 bg-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                </IconButton>
              </div>

              <ScrollArea edgeFade className="@container min-h-0 flex-1">
                <div className="flex flex-col gap-3 px-2 pb-2">
                  {section === "profile" ? (
                    <SettingGroup
                      icon={UserAccountIcon}
                      title="Profile"
                      desc="How stores and couriers see you."
                    >
                      <form
                        onSubmit={saveProfile}
                        className="border-t border-border pt-3.5 @xs:flex @xs:items-end @xs:gap-3"
                      >
                        <TextField
                          id="profile-name"
                          label="Name"
                          value={name}
                          onChange={(next) => {
                            setName(next);
                            setProfileNote(null);
                          }}
                          placeholder="Your name"
                          autoComplete="name"
                        />
                        <button type="submit" disabled={savingProfile} className={SAVE_CLASS}>
                          {savingProfile ? "Saving…" : "Save"}
                        </button>
                      </form>
                      <FormNote note={profileNote} />
                    </SettingGroup>
                  ) : null}

                  {section === "preferences" ? (
                    <SettingGroup
                      icon={AccountSettingIcon}
                      title="Preferences"
                      desc="Applies on this device."
                    >
                      <OptionRow
                        title="Appearance"
                        desc="Day sky or night sky."
                        control={
                          <Segmented
                            name="appearance"
                            value={night ? "night" : "day"}
                            onChange={(next) => chooseTheme(next === "night")}
                            options={[
                              { value: "day", label: "Day", icon: Sun03Icon },
                              { value: "night", label: "Night", icon: Moon02Icon },
                            ]}
                          />
                        }
                      />
                      <OptionRow
                        title="Currency"
                        desc="Prices shown across the store."
                        control={
                          <Segmented
                            name="currency"
                            value={prefs.currency}
                            onChange={(currency) => patch({ currency })}
                            options={CURRENCIES}
                          />
                        }
                      />
                    </SettingGroup>
                  ) : null}

                  {section === "notifications" ? (
                    <SettingGroup
                      icon={Notification01Icon}
                      title="Notifications"
                      desc="We only email what you ask for."
                    >
                      <OptionRow
                        title="Order updates"
                        desc="Dispatch, delivery and returns."
                        control={
                          <Toggle
                            label="Order updates"
                            checked={prefs.orderUpdates}
                            onChange={(orderUpdates) => patch({ orderUpdates })}
                          />
                        }
                      />
                      <OptionRow
                        title="Price drops"
                        desc="When something you liked gets cheaper."
                        control={
                          <Toggle
                            label="Price drops"
                            checked={prefs.priceDrops}
                            onChange={(priceDrops) => patch({ priceDrops })}
                          />
                        }
                      />
                      <OptionRow
                        title="Product picks"
                        desc="Occasional suggestions from the AI."
                        control={
                          <Toggle
                            label="Product picks"
                            checked={prefs.productPicks}
                            onChange={(productPicks) => patch({ productPicks })}
                          />
                        }
                      />
                    </SettingGroup>
                  ) : null}

                  {section === "password" ? (
                    <SettingGroup
                      icon={KeyIcon}
                      title="Password"
                      desc="Other devices are signed out when it changes."
                    >
                      <form
                        onSubmit={savePassword}
                        className="flex flex-col gap-3 @lg:flex-row @lg:items-end"
                      >
                        <TextField
                          id="current-password"
                          label="Current"
                          type="password"
                          value={currentPassword}
                          onChange={(next) => {
                            setCurrentPassword(next);
                            setPasswordNote(null);
                          }}
                          placeholder="Your password"
                          autoComplete="current-password"
                        />
                        <TextField
                          id="new-password"
                          label="New"
                          type="password"
                          value={newPassword}
                          onChange={(next) => {
                            setNewPassword(next);
                            setPasswordNote(null);
                          }}
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                        />
                        <button type="submit" disabled={savingPassword} className={SAVE_CLASS}>
                          {savingPassword ? "Saving…" : "Update"}
                        </button>
                      </form>
                      <FormNote note={passwordNote} />
                    </SettingGroup>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-base font-semibold text-foreground">Account settings</h2>
            <p className="max-w-[36ch] text-sm text-muted">
              Sign in to sync your profile, orders and favourites.
            </p>
            <button type="button" onClick={onSignIn} className={SAVE_CLASS}>
              Sign in
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function SettingGroup({
  icon,
  title,
  desc,
  children,
}: {
  icon: IconSvgElement;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="@container rounded-3xl border border-border bg-surface p-4 shadow-card">
      <header className="flex items-start gap-3 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-foreground">
          <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="pt-0.5 text-xs text-subtle">{desc}</p>
        </div>
      </header>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function OptionRow({ title, desc, control }: { title: string; desc: string; control: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border py-3 first:border-t-0 first:pt-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="pt-0.5 text-xs text-subtle">{desc}</p>
      </div>
      {control}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ease-expo",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
        checked
          ? "border-transparent bg-[image:var(--gradient-brand)]"
          : "border-border-strong bg-surface-hover dark:border-border"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow-card",
          "transition-[left] duration-200 ease-expo",
          checked ? "left-[22px]" : "left-[3px]"
        )}
      />
    </button>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: { value: T; label: string; icon?: IconSvgElement }[];
  value: T;
  onChange: (next: T) => void;
  name: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              "transition-colors duration-200 ease-expo",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-blue",
              active ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon ? <HugeiconsIcon icon={option.icon} size={14} strokeWidth={2} /> : null}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function FormNote({ note }: { note: Note | null }) {
  if (!note) return null;
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 pt-2 text-xs",
        note.ok ? "text-muted" : "text-red-500"
      )}
    >
      {note.ok ? (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={14}
          strokeWidth={2}
          className="text-brand-cyan"
        />
      ) : null}
      {note.text}
    </p>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="px-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={type === "password" && autoComplete === "new-password" ? 8 : undefined}
        className={INPUT_CLASS}
      />
    </label>
  );
}
