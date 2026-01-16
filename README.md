This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.









```
rosca-app
├─ app
│  ├─ (auth)
│  │  ├─ forgot-password
│  │  │  └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ login
│  │  │  └─ page.tsx
│  │  └─ register
│  │     └─ page.tsx
│  ├─ (dashboard)
│  │  ├─ activity
│  │  │  └─ page.tsx
│  │  ├─ dashboard
│  │  │  └─ page.tsx
│  │  ├─ groups
│  │  │  ├─ create
│  │  │  │  └─ page.tsx
│  │  │  ├─ page.tsx
│  │  │  ├─ test
│  │  │  │  └─ page.tsx
│  │  │  └─ [id]
│  │  │     ├─ error.tsx
│  │  │     ├─ loading.tsx
│  │  │     └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ members
│  │  │  └─ page.tsx
│  │  ├─ notifications
│  │  │  └─ page.tsx
│  │  ├─ payments
│  │  │  └─ page.tsx
│  │  ├─ reports
│  │  │  └─ page.tsx
│  │  └─ settings
│  │     └─ page.tsx
│  ├─ api
│  │  ├─ activities
│  │  │  ├─ recent
│  │  │  │  └─ route.ts
│  │  │  └─ route.ts
│  │  ├─ auth
│  │  │  ├─ forgot-password
│  │  │  │  └─ route.ts
│  │  │  ├─ login
│  │  │  │  └─ route.ts
│  │  │  ├─ logout
│  │  │  │  └─ route.ts
│  │  │  ├─ me
│  │  │  │  └─ route.ts
│  │  │  └─ register
│  │  │     └─ route.ts
│  │  ├─ cron
│  │  │  └─ reminder
│  │  │     └─ route.ts
│  │  ├─ dashboard
│  │  │  └─ route.ts
│  │  ├─ groups
│  │  │  ├─ route.ts
│  │  │  └─ [groupId]
│  │  │     ├─ cycles
│  │  │     │  ├─ route.ts
│  │  │     │  ├─ upcoming
│  │  │     │  │  └─ route.ts
│  │  │     │  └─ [cycleId]
│  │  │     │     ├─ activate
│  │  │     │     │  └─ route.ts
│  │  │     │     ├─ complete
│  │  │     │     │  └─ route.ts
│  │  │     │     ├─ route.ts
│  │  │     │     ├─ skip
│  │  │     │     │  └─ route.ts
│  │  │     │     └─ unskip
│  │  │     │        └─ route.ts
│  │  │     ├─ export
│  │  │     │  └─ overview
│  │  │     │     └─ route.ts
│  │  │     ├─ members
│  │  │     │  ├─ route.ts
│  │  │     │  ├─ simple
│  │  │     │  │  └─ route.ts
│  │  │     │  └─ [memberId]
│  │  │     │     └─ route.ts
│  │  │     ├─ overview
│  │  │     │  └─ route.ts
│  │  │     ├─ payments
│  │  │     │  ├─ bulk
│  │  │     │  │  ├─ mark-paid
│  │  │     │  │  │  └─ route.ts
│  │  │     │  │  └─ remind
│  │  │     │  │     └─ route.ts
│  │  │     │  ├─ recent
│  │  │     │  │  └─ route.ts
│  │  │     │  ├─ remind-all
│  │  │     │  │  └─ route.ts
│  │  │     │  ├─ route.ts
│  │  │     │  └─ [paymentId]
│  │  │     │     ├─ mark-paid
│  │  │     │     │  └─ route.ts
│  │  │     │     ├─ mark-unpaid
│  │  │     │     │  └─ route.ts
│  │  │     │     ├─ receipt
│  │  │     │     │  └─ route.ts
│  │  │     │     ├─ remind
│  │  │     │     │  └─ route.ts
│  │  │     │     └─ route.ts
│  │  │     ├─ route.ts
│  │  │     ├─ settings
│  │  │     │  ├─ public
│  │  │     │  │  └─ [code]
│  │  │     │  │     ├─ regenerate-invite
│  │  │     │  │     │  └─ route.ts
│  │  │     │  │     └─ route.ts
│  │  │     │  └─ route.ts
│  │  │     └─ transfer-leadership
│  │  │        └─ route.ts
│  │  ├─ members
│  │  │  └─ route.ts
│  │  ├─ notifications
│  │  │  └─ route.ts
│  │  ├─ payments
│  │  │  └─ route.ts
│  │  ├─ reports
│  │  │  ├─ export
│  │  │  │  └─ route.ts
│  │  │  └─ route.ts
│  │  ├─ search
│  │  │  └─ route.ts
│  │  └─ users
│  │     ├─ check
│  │     │  └─ route.ts
│  │     ├─ delete
│  │     │  └─ route.ts
│  │     ├─ profile
│  │     │  └─ route.ts
│  │     └─ security
│  │        └─ route.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ loading.tsx
│  ├─ page.tsx
│  └─ public-invite
│     └─ [id]
│        └─ [code]
│           └─ page.tsx
├─ components
│  ├─ activity
│  │  └─ ActivityLog.tsx
│  ├─ dashboard
│  │  ├─ DashboardStats.tsx
│  │  ├─ QuickActions.tsx
│  │  ├─ RecentActivity.tsx
│  │  ├─ UpcomingPayments.tsx
│  │  └─ YourGroups.tsx
│  ├─ groups
│  │  ├─ CycleManagement.tsx
│  │  ├─ GroupCreationForm.tsx
│  │  ├─ GroupHeader.tsx
│  │  ├─ GroupOverview.tsx
│  │  ├─ GroupSettings.tsx
│  │  ├─ GroupTabs.tsx
│  │  ├─ MemberAssignment.tsx
│  │  ├─ MemberList.tsx
│  │  ├─ NumberDraw.tsx
│  │  ├─ PaymentTracker.tsx
│  │  └─ PlaceholderTab.tsx
│  ├─ home
│  │  ├─ FeaturesSection.tsx
│  │  └─ HeroSection.tsx
│  ├─ layout
│  │  ├─ DashboardHeader.tsx
│  │  ├─ DashboardSidebar.tsx
│  │  ├─ Footer.tsx
│  │  ├─ Header.tsx
│  │  ├─ LoadingWrapper.tsx
│  │  └─ ProtectedRoute.tsx
│  ├─ members
│  │  ├─ MembersFilters.tsx
│  │  ├─ MembersGrid.tsx
│  │  ├─ MembersHeader.tsx
│  │  └─ MemberStats.tsx
│  ├─ notifications
│  │  ├─ NotificationsClient.tsx
│  │  ├─ NotificationsHeader.tsx
│  │  └─ NotificationsList.tsx
│  ├─ payments
│  │  ├─ PaymentFilters.tsx
│  │  ├─ PaymentsClient.tsx
│  │  ├─ PaymentsHeader.tsx
│  │  ├─ PaymentsTable.tsx
│  │  └─ PaymentStats.tsx
│  ├─ providers
│  │  └─ AuthProvider.tsx
│  ├─ reports
│  │  ├─ DynamicChart.tsx
│  │  ├─ GeneralReport.tsx
│  │  ├─ GroupCards.tsx
│  │  ├─ ReportsClient.tsx
│  │  └─ ReportsHeader.tsx
│  ├─ settings
│  │  ├─ DangerZone.tsx
│  │  ├─ ProfileSettings.tsx
│  │  ├─ SecuritySettings.tsx
│  │  ├─ SettingsHeader.tsx
│  │  └─ SettingsTabs.tsx
│  └─ ui
│     └─ Loader
│        └─ CircularLoader.tsx
├─ eslint.config.mjs
├─ lib
│  ├─ constants
│  │  └─ colors.ts
│  ├─ cron
│  │  └─ reminders.ts
│  ├─ db
│  │  ├─ connect.ts
│  │  └─ models
│  │     ├─ Activity.ts
│  │     ├─ AuditLog.ts
│  │     ├─ Group.ts
│  │     ├─ GroupMember.ts
│  │     ├─ GroupSettings.ts
│  │     ├─ index.ts
│  │     ├─ Invitation.ts
│  │     ├─ Notification.ts
│  │     ├─ Payment.ts
│  │     ├─ PaymentCycle.ts
│  │     └─ User.ts
│  ├─ session.ts
│  └─ utils
│     ├─ api.ts
│     ├─ auth.ts
│     ├─ export.ts
│     ├─ jwt.ts
│     ├─ notifications.ts
│     └─ validation.ts
├─ middleware.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ Images
│  │  ├─ avatar.jpeg
│  │  ├─ hero_image.jpg
│  │  └─ rosca_logo.png
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ tailwind.config.ts
├─ tsconfig.json
└─ types
   ├─ group.ts
   ├─ index.ts
   ├─ member.ts
   ├─ next-auth.d.ts
   ├─ notification.ts
   ├─ payment.ts
   └─ user.ts

```