import { z } from 'zod';
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const uuidSchema: z.ZodString;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const characterSchema: z.ZodObject<{
    name: z.ZodString;
    title: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    archetype: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    lore: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    title?: string | undefined;
    archetype?: string | undefined;
    lore?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name: string;
    title?: string | undefined;
    archetype?: string | undefined;
    lore?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export declare const arenaSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    description?: string | undefined;
}, {
    name: string;
    slug: string;
    description?: string | undefined;
}>;
export declare const questSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    arenaId: z.ZodString;
    type: z.ZodEnum<["DAILY", "WEEKLY", "SIDE", "MAIN", "BOSS", "MAINTENANCE", "RECOVERY", "EXPLORATION"]>;
    difficulty: z.ZodEnum<["TRIVIAL", "EASY", "NORMAL", "HARD", "EPIC", "BOSS"]>;
    xpReward: z.ZodNumber;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "ACTIVE", "COMPLETED", "ABANDONED"]>>;
    dueAt: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    type: "DAILY" | "WEEKLY" | "SIDE" | "MAIN" | "BOSS" | "MAINTENANCE" | "RECOVERY" | "EXPLORATION";
    title: string;
    arenaId: string;
    difficulty: "BOSS" | "TRIVIAL" | "EASY" | "NORMAL" | "HARD" | "EPIC";
    xpReward: number;
    status?: "DRAFT" | "ACTIVE" | "COMPLETED" | "ABANDONED" | undefined;
    description?: string | undefined;
    dueAt?: string | undefined;
}, {
    type: "DAILY" | "WEEKLY" | "SIDE" | "MAIN" | "BOSS" | "MAINTENANCE" | "RECOVERY" | "EXPLORATION";
    title: string;
    arenaId: string;
    difficulty: "BOSS" | "TRIVIAL" | "EASY" | "NORMAL" | "HARD" | "EPIC";
    xpReward: number;
    status?: "DRAFT" | "ACTIVE" | "COMPLETED" | "ABANDONED" | undefined;
    description?: string | undefined;
    dueAt?: string | undefined;
}>;
export declare const journalSchema: z.ZodObject<{
    built: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    burned: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    protect: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    built?: string | undefined;
    burned?: string | undefined;
    protect?: string | undefined;
}, {
    built?: string | undefined;
    burned?: string | undefined;
    protect?: string | undefined;
}>;
export declare const journalDateSchema: z.ZodString;
export declare const questCompletionRequestSchema: z.ZodObject<{
    questId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    questId: string;
}, {
    questId: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CharacterInput = z.infer<typeof characterSchema>;
export type ArenaInput = z.infer<typeof arenaSchema>;
export type QuestInput = z.infer<typeof questSchema>;
export type JournalInput = z.infer<typeof journalSchema>;
