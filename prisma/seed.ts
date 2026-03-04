import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // 1. Create Admin user
    const admin = await prisma.user.upsert({
        where: { phone: "0901234567" },
        update: {},
        create: {
            phone: "0901234567",
            name: "Admin CLB",
            role: "ADMIN",
            status: "ACTIVE",
        },
    });
    console.log("Admin created:", admin.id);

    // Create admin player
    await prisma.player.upsert({
        where: { userId: admin.id },
        update: {},
        create: {
            userId: admin.id,
            fullName: "Admin CLB",
            type: "FIXED",
            active: true,
        },
    });

    // 2. Create Fixed players with users
    const fixedPlayers = [
        { phone: "0911111111", name: "Nguyen Van A" },
        { phone: "0922222222", name: "Tran Van B" },
        { phone: "0933333333", name: "Le Van C" },
        { phone: "0944444444", name: "Pham Van D" },
    ];

    for (const fp of fixedPlayers) {
        const user = await prisma.user.upsert({
            where: { phone: fp.phone },
            update: {},
            create: {
                phone: fp.phone,
                name: fp.name,
                role: "MEMBER",
                status: "ACTIVE",
            },
        });
        await prisma.player.upsert({
            where: { userId: user.id },
            update: {},
            create: {
                userId: user.id,
                fullName: fp.name,
                type: "FIXED",
                active: true,
            },
        });
        console.log(`Fixed player created: ${fp.name}`);
    }

    // 3. Create Guest players (may not have user accounts)
    const guestUser1 = await prisma.user.upsert({
        where: { phone: "0955555555" },
        update: {},
        create: {
            phone: "0955555555",
            name: "Guest Minh",
            role: "MEMBER",
            status: "ACTIVE",
        },
    });

    await prisma.player.create({
        data: {
            userId: guestUser1.id,
            fullName: "Guest Minh",
            type: "GUEST",
            guestFeeOverride: 60000,
            active: true,
        },
    }).catch(() => { }); // ignore if exists

    await prisma.player.create({
        data: {
            fullName: "Guest Tuan",
            type: "GUEST",
            active: true,
        },
    }).catch(() => { });

    console.log("Guest players created");

    // 4. Create a court
    const court = await prisma.court.upsert({
        where: { id: "court-main" },
        update: {},
        create: {
            id: "court-main",
            name: "San Phu Nhuan",
            location: "123 Hoang Van Thu, Phu Nhuan, TP.HCM",
            description: "San chinh cua CLB, 2 san don + 1 san doi",
            passEnabled: true,
            maxCheckin: 8,
            defaultCourtFee: 200000,
            active: true,
        },
    });
    console.log("Court created:", court.name);

    // 5. Create sample sessions for current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const sessionDates = [];
    for (let day = 1; day <= 28; day++) {
        const date = new Date(year, month, day);
        const dow = date.getDay();
        // Tuesday (2) and Thursday (4) and Saturday (6)
        if (dow === 2 || dow === 4 || dow === 6) {
            sessionDates.push(date);
        }
    }

    const allPlayers = await prisma.player.findMany({ where: { active: true } });

    for (let i = 0; i < Math.min(sessionDates.length, 8); i++) {
        const date = sessionDates[i];
        const startAt = new Date(date);
        startAt.setHours(19, 0, 0, 0);
        const endAt = new Date(date);
        endAt.setHours(21, 0, 0, 0);
        const remindAt = new Date(startAt.getTime() - 6 * 60 * 60 * 1000);

        const session = await prisma.session.create({
            data: {
                courtId: court.id,
                startAt,
                endAt,
                courtFee: 200000,
                shuttleFee: i < 4 ? 100000 : 0,
                passStatus: i === 2 ? "SUCCESS" : "NONE",
                remindAt,
                status: "OPEN",
            },
        });

        // Add attendances for some players
        const attendingPlayers = allPlayers.slice(0, Math.min(4 + (i % 3), allPlayers.length));
        for (const player of attendingPlayers) {
            await prisma.attendance.create({
                data: {
                    sessionId: session.id,
                    playerId: player.id,
                    attending: true,
                    checkinAt: new Date(),
                },
            }).catch(() => { });
        }

        console.log(`Session ${i + 1} created: ${startAt.toLocaleDateString("vi-VN")}`);
    }

    // 6. Create default settings
    const defaultSettings = [
        { key: "guest_fee_default", valueJson: 50000 },
        { key: "remind_threshold", valueJson: 4 },
        { key: "delta_handling", valueJson: "carry_to_next" },
        { key: "auth_require_otp", valueJson: false },
        { key: "default_shuttle_fee", valueJson: 0 },
        { key: "remind_offset_hours", valueJson: 6 },
    ];

    for (const s of defaultSettings) {
        await prisma.setting.upsert({
            where: { key: s.key },
            update: { valueJson: s.valueJson as any },
            create: { key: s.key, valueJson: s.valueJson as any },
        });
    }
    console.log("Settings created");

    console.log("\n=== Seed completed! ===");
    console.log("Admin login: 0901234567");
    console.log("Member login: 0911111111");
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
