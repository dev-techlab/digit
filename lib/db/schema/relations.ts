import { relations } from 'drizzle-orm';
import { users, wallets, sessions } from './users';
import {
  gameProviders,
  providerDepositTiers,
  userProviderAccounts,
} from './providers';
import { orders, transactions } from './finance';
import {
  bonuses,
  userBonusClaims,
  referralCommissions,
  redemptionReviews,
  profileTasks,
  userProfileTaskClaims,
} from './engagement';
import { helpSections, helpItems, helpSteps } from './content';
import {
  admins,
  roles,
  permissions,
  rolePermissions,
  adminRoles,
  adminPermissions,
  adminSessions,
  adminInvitations,
} from './rbac';

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  referredBy: one(users, {
    fields: [users.referredByUserId],
    references: [users.id],
    relationName: 'referrals',
  }),
  referrals: many(users, { relationName: 'referrals' }),
  sessions: many(sessions),
  orders: many(orders),
  transactions: many(transactions),
  providerAccounts: many(userProviderAccounts),
  bonusClaims: many(userBonusClaims),
  redemptionReviews: many(redemptionReviews),
  taskClaims: many(userProfileTaskClaims),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}));

export const gameProvidersRelations = relations(gameProviders, ({ many }) => ({
  depositTiers: many(providerDepositTiers),
  userAccounts: many(userProviderAccounts),
}));

export const providerDepositTiersRelations = relations(providerDepositTiers, ({ one }) => ({
  provider: one(gameProviders, {
    fields: [providerDepositTiers.providerId],
    references: [gameProviders.id],
  }),
}));

export const userProviderAccountsRelations = relations(userProviderAccounts, ({ one }) => ({
  user: one(users, { fields: [userProviderAccounts.userId], references: [users.id] }),
  provider: one(gameProviders, {
    fields: [userProviderAccounts.providerId],
    references: [gameProviders.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const bonusesRelations = relations(bonuses, ({ many }) => ({
  claims: many(userBonusClaims),
}));

export const userBonusClaimsRelations = relations(userBonusClaims, ({ one }) => ({
  user: one(users, { fields: [userBonusClaims.userId], references: [users.id] }),
  bonus: one(bonuses, { fields: [userBonusClaims.bonusId], references: [bonuses.id] }),
}));

export const referralCommissionsRelations = relations(referralCommissions, ({ one }) => ({
  referrer: one(users, {
    fields: [referralCommissions.referrerUserId],
    references: [users.id],
  }),
}));

export const redemptionReviewsRelations = relations(redemptionReviews, ({ one }) => ({
  user: one(users, { fields: [redemptionReviews.userId], references: [users.id] }),
  provider: one(gameProviders, {
    fields: [redemptionReviews.providerId],
    references: [gameProviders.id],
  }),
}));

export const profileTasksRelations = relations(profileTasks, ({ many }) => ({
  claims: many(userProfileTaskClaims),
}));

export const userProfileTaskClaimsRelations = relations(userProfileTaskClaims, ({ one }) => ({
  user: one(users, { fields: [userProfileTaskClaims.userId], references: [users.id] }),
  task: one(profileTasks, {
    fields: [userProfileTaskClaims.taskKey],
    references: [profileTasks.key],
  }),
}));

export const helpSectionsRelations = relations(helpSections, ({ many }) => ({
  items: many(helpItems),
}));

export const helpItemsRelations = relations(helpItems, ({ one, many }) => ({
  section: one(helpSections, {
    fields: [helpItems.sectionId],
    references: [helpSections.id],
  }),
  steps: many(helpSteps),
}));

export const helpStepsRelations = relations(helpSteps, ({ one }) => ({
  item: one(helpItems, { fields: [helpSteps.itemId], references: [helpItems.id] }),
}));

// --- RBAC ---
export const adminsRelations = relations(admins, ({ many }) => ({
  roles: many(adminRoles),
  directPermissions: many(adminPermissions),
  sessions: many(adminSessions),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  admins: many(adminRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
  adminOverrides: many(adminPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const adminRolesRelations = relations(adminRoles, ({ one }) => ({
  admin: one(admins, { fields: [adminRoles.adminId], references: [admins.id] }),
  role: one(roles, { fields: [adminRoles.roleId], references: [roles.id] }),
}));

export const adminPermissionsRelations = relations(adminPermissions, ({ one }) => ({
  admin: one(admins, { fields: [adminPermissions.adminId], references: [admins.id] }),
  permission: one(permissions, {
    fields: [adminPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(admins, { fields: [adminSessions.adminId], references: [admins.id] }),
}));

export const adminInvitationsRelations = relations(adminInvitations, ({ one }) => ({
  role: one(roles, { fields: [adminInvitations.roleId], references: [roles.id] }),
}));
