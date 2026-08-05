export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? "").join("").toUpperCase();
