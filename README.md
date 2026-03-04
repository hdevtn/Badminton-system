# Badminton Club Manager

Webapp quan ly lich san va tinh tien cau long.

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **UI**: TailwindCSS + shadcn/ui + lucide-react
- **Database**: MySQL 8.0 (InnoDB) + Prisma ORM
- **Queue/Jobs**: Redis + BullMQ
- **Auth**: Session cookie (iron-session) + Phone login (no OTP by default)

## Chay local (khong Docker)

### Yeu cau

- Node.js 20+
- MySQL 8.0
- Redis 7+

### Cai dat

```bash
# 1. Clone va cai dependencies
npm install

# 2. Copy env
cp .env.example .env
# Chinh sua DATABASE_URL, REDIS_URL, SESSION_SECRET trong .env

# 3. Tao database MySQL
mysql -u root -p -e "CREATE DATABASE badminton_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Chay migration
npx prisma migrate dev --name init

# 5. Generate Prisma client
npx prisma generate

# 6. Seed data mau
npm run db:seed

# 7. Chay dev server
npm run dev
```

Truy cap http://localhost:3000

### Tai khoan test

| Vai tro | So dien thoai | Ghi chu |
|---------|---------------|---------|
| Admin   | 0901234567    | Dang nhap ngay, khong OTP |
| Member  | 0911111111    | Nguyen Van A |
| Member  | 0922222222    | Tran Van B |
| Member  | 0933333333    | Le Van C |
| Member  | 0944444444    | Pham Van D |
| Guest   | 0955555555    | Guest Minh |

## Chay voi Docker Compose

```bash
# Build va chay
docker-compose up -d

# Chay migration + seed
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Dang nhap bang SĐT (auto login neu user ton tai)
- `POST /api/auth/request-otp` - Gui OTP (chi khi can)
- `POST /api/auth/verify-otp` - Xac thuc OTP
- `POST /api/auth/logout` - Dang xuat
- `GET /api/me` - Thong tin user hien tai

### Courts
- `GET /api/courts` - Danh sach san
- `POST /api/courts` - Tao san (Admin)
- `GET /api/courts/:id` - Chi tiet san
- `PATCH /api/courts/:id` - Cap nhat san (Admin)
- `DELETE /api/courts/:id` - Xoa san (Admin)

### Players
- `GET /api/players` - Danh sach nguoi choi
- `POST /api/players` - Tao nguoi choi (Admin)
- `POST /api/players/import-fixed-roster` - Import roster (Admin)
- `PATCH /api/players/:id` - Cap nhat (Admin)
- `DELETE /api/players/:id` - Xoa (Admin)

### Schedules & Sessions
- `POST /api/schedules/generate-month` - Tao lich thang (Admin)
- `GET /api/sessions?month=YYYY-MM&courtId=` - Danh sach buoi tap
- `GET /api/sessions/:id` - Chi tiet buoi tap
- `PATCH /api/sessions/:id` - Cap nhat (Admin)

### Attendance
- `POST /api/sessions/:id/checkin` - Diem danh (enforce max 8)

### Billing
- `POST /api/billing/recalculate-session/:id` - Tinh lai chi phi (Admin)
- `POST /api/billing/generate-invoices?period=YYYY-MM` - Tao hoa don (Admin)
- `GET /api/invoices?period=YYYY-MM` - Danh sach hoa don
- `GET /api/invoices/:id` - Chi tiet hoa don + QR VietQR
- `POST /api/payments/manual` - Ghi nhan thanh toan (Admin)

### Settings
- `GET /api/settings` - Xem cai dat
- `PATCH /api/settings` - Cap nhat cai dat (Admin)

## Cong thuc tinh tien

Tinh theo tung session S:

1. `courtFeeNet(S) = 0` neu pass SUCCESS, nguoc lai `= courtFee(S)`
2. `guestPay(u,S) = 0` neu pass SUCCESS, nguoc lai `= guest_fee(u)` cho guest attending
3. `guestTotal(S) = sum(guestPay)`
4. `netCost(S) = courtFeeNet(S) + shuttleFee(S) - guestTotal(S)`
5. `fixedUnit(S) = netCost(S) / count(fixed_roster)` (toan bo roster co dinh)
6. `fixedPay(u,S) = fixedUnit(S)` neu attending, `0` neu vang
7. `delta(S) = netCost(S) - fixedUnit(S) * count(fixed_attendees(S))`

Delta handling: `carry_to_next` | `split_among_attendees` | `split_among_roster`

## Cau truc thu muc

```
src/
  app/
    api/           # API route handlers
    (app)/         # Protected pages (layout with sidebar)
      admin/       # Admin pages
      calendar/    # Member calendar
      sessions/    # Session detail
      me/          # Member finance
      invoices/    # Invoice detail
    login/         # Login page
  components/
    ui/            # shadcn/ui components
    auth-provider  # Auth context
  lib/
    prisma.ts      # DB client
    session.ts     # Auth session
    validations.ts # Zod schemas
    billing-engine # Billing logic
    settings.ts    # Settings service
    queue.ts       # BullMQ jobs
    zalo-client    # Zalo OA integration
    vietqr.ts      # VietQR integration
    otp-provider   # Pluggable OTP
    rate-limit.ts  # Rate limiting
    logger.ts      # Logging
prisma/
  schema.prisma    # Database schema
  seed.ts          # Seed data
```

## License

Private - CLB Badminton
