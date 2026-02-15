import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// biome-ignore lint/style/noNonNullAssertion: Ignore as it exists in .env
const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({ connectionString });

declare global {
    var __prisma: PrismaClient | undefined;
}

export const prisma =
    globalThis.__prisma ||
    new PrismaClient({
        adapter,
    });

if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prisma;
}
