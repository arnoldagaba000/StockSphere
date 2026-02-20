import type { AppUserRole } from "./roles";
import { USER_ROLES } from "./roles";

/**
 * Permission keys aligned to the RBAC PDF.
 * Format: `domain.action` to keep checks readable and stable.
 */
export const PERMISSIONS = {
    // 4.1 Authentication & Session
    AUTH_REGISTER: "auth.register",
    AUTH_LOGIN: "auth.login",
    AUTH_LOGOUT: "auth.logout",
    AUTH_SESSION_VIEW_OWN: "auth.session.view_own",
    AUTH_SESSION_REVOKE_OWN: "auth.session.revoke_own",
    AUTH_PASSWORD_RESET_REQUEST: "auth.password_reset.request",
    AUTH_PASSWORD_RESET_CONFIRM: "auth.password_reset.confirm",
    AUTH_SESSION_VIEW_OTHERS: "auth.session.view_others",
    AUTH_SESSION_FORCE_EXPIRE_OTHERS: "auth.session.force_expire_others",

    // 4.2 User Profile
    PROFILE_VIEW_OWN: "profile.view_own",
    PROFILE_EDIT_OWN: "profile.edit_own",
    PROFILE_CHANGE_PASSWORD_OWN: "profile.change_password_own",
    PROFILE_CHANGE_EMAIL_OWN: "profile.change_email_own",
    PROFILE_SET_NOTIFICATIONS_OWN: "profile.set_notifications_own",
    PROFILE_VIEW_OTHERS: "profile.view_others",
    PROFILE_EDIT_OTHERS: "profile.edit_others",

    // 4.3 User Management
    USERS_VIEW_LIST: "users.view_list",
    USERS_VIEW_DETAIL_ACTIVITY: "users.view_detail_activity",
    USERS_INVITE_CREATE: "users.invite_create",
    USERS_ASSIGN_VIEWER: "users.assign_viewer",
    USERS_ASSIGN_STAFF: "users.assign_staff",
    USERS_ASSIGN_MANAGER: "users.assign_manager",
    USERS_ASSIGN_ADMIN: "users.assign_admin",
    USERS_ASSIGN_SUPER_ADMIN: "users.assign_super_admin",
    USERS_DEACTIVATE: "users.deactivate",
    USERS_REACTIVATE: "users.reactivate",
    USERS_DELETE_PERMANENT: "users.delete_permanent",
    USERS_IMPERSONATE: "users.impersonate",

    // 4.4 Products & Categories
    PRODUCTS_VIEW_LIST: "products.view_list",
    PRODUCTS_SEARCH_FILTER: "products.search_filter",
    PRODUCTS_VIEW_DETAIL: "products.view_detail",
    PRODUCTS_CREATE: "products.create",
    PRODUCTS_EDIT_DETAILS: "products.edit_details",
    PRODUCTS_EDIT_PRICING: "products.edit_pricing",
    PRODUCTS_EDIT_REORDER_POINTS: "products.edit_reorder_points",
    PRODUCTS_EDIT_TRACKING_FLAGS: "products.edit_tracking_flags",
    PRODUCTS_MARK_INACTIVE: "products.mark_inactive",
    PRODUCTS_DELETE_HARD: "products.delete_hard",
    PRODUCTS_EXPORT: "products.export",
    PRODUCTS_IMPORT_CSV: "products.import_csv",
    CATEGORIES_VIEW: "categories.view",
    CATEGORIES_CREATE: "categories.create",
    CATEGORIES_EDIT: "categories.edit",
    CATEGORIES_REPARENT: "categories.reparent",
    CATEGORIES_DELETE: "categories.delete",

    // 4.5 Warehouses & Locations
    WAREHOUSES_VIEW_LIST: "warehouses.view_list",
    WAREHOUSES_VIEW_DETAIL: "warehouses.view_detail",
    WAREHOUSES_CREATE: "warehouses.create",
    WAREHOUSES_EDIT: "warehouses.edit",
    WAREHOUSES_DEACTIVATE: "warehouses.deactivate",
    WAREHOUSES_DELETE: "warehouses.delete",
    LOCATIONS_VIEW: "locations.view",
    LOCATIONS_CREATE: "locations.create",
    LOCATIONS_EDIT: "locations.edit",
    LOCATIONS_SET_TYPE: "locations.set_type",
    LOCATIONS_DEACTIVATE: "locations.deactivate",
    LOCATIONS_DELETE: "locations.delete",

    // 4.6 Inventory & Stock
    INVENTORY_STOCK_OVERVIEW: "inventory.stock.overview",
    INVENTORY_STOCK_BY_PRODUCT: "inventory.stock.by_product",
    INVENTORY_STOCK_BY_LOCATION: "inventory.stock.by_location",
    INVENTORY_RESERVED_VIEW: "inventory.reserved.view",
    INVENTORY_BATCH_SERIAL_BREAKDOWN: "inventory.batch_serial.breakdown",
    INVENTORY_EXPIRY_DETAILS: "inventory.expiry.details",
    INVENTORY_LOW_STOCK_ALERTS: "inventory.low_stock_alerts",
    INVENTORY_ADJUST_SMALL: "inventory.adjust.small",
    INVENTORY_ADJUST_LARGE: "inventory.adjust.large",
    INVENTORY_ADJUST_APPROVE: "inventory.adjust.approve",
    INVENTORY_ADJUST_REJECT: "inventory.adjust.reject",
    INVENTORY_TRANSFER_INITIATE: "inventory.transfer.initiate",
    INVENTORY_TRANSFER_COMPLETE: "inventory.transfer.complete",
    INVENTORY_TRANSFER_CANCEL_IN_TRANSIT:
        "inventory.transfer.cancel_in_transit",
    INVENTORY_CYCLE_COUNT_PERFORM: "inventory.cycle_count.perform",
    INVENTORY_CYCLE_COUNT_SUBMIT_DISCREPANCY:
        "inventory.cycle_count.submit_discrepancy",
    INVENTORY_HISTORY_ADJUSTMENT_VIEW: "inventory.history.adjustment_view",
    INVENTORY_HISTORY_MOVEMENT_VIEW: "inventory.history.movement_view",
    INVENTORY_INITIAL_STOCK_ENTRY: "inventory.initial_stock_entry",

    // 4.7 Supplier Management
    SUPPLIERS_VIEW_LIST: "suppliers.view_list",
    SUPPLIERS_VIEW_DETAIL: "suppliers.view_detail",
    SUPPLIERS_VIEW_PO_HISTORY: "suppliers.view_po_history",
    SUPPLIERS_CREATE: "suppliers.create",
    SUPPLIERS_EDIT: "suppliers.edit",
    SUPPLIERS_MANAGE_PRODUCT_LINKS: "suppliers.manage_product_links",
    SUPPLIERS_DEACTIVATE: "suppliers.deactivate",
    SUPPLIERS_DELETE: "suppliers.delete",

    // 4.8 Purchase Orders
    PURCHASE_ORDERS_VIEW_LIST: "purchase_orders.view_list",
    PURCHASE_ORDERS_VIEW_DETAIL: "purchase_orders.view_detail",
    PURCHASE_ORDERS_CREATE_DRAFT: "purchase_orders.create_draft",
    PURCHASE_ORDERS_EDIT_DRAFT: "purchase_orders.edit_draft",
    PURCHASE_ORDERS_SUBMIT_FOR_APPROVAL: "purchase_orders.submit_for_approval",
    PURCHASE_ORDERS_APPROVE: "purchase_orders.approve",
    PURCHASE_ORDERS_REJECT: "purchase_orders.reject",
    PURCHASE_ORDERS_MARK_ORDERED: "purchase_orders.mark_ordered",
    PURCHASE_ORDERS_RECEIVE_GOODS: "purchase_orders.receive_goods",
    PURCHASE_ORDERS_CANCEL: "purchase_orders.cancel",
    PURCHASE_ORDERS_DELETE_DRAFT: "purchase_orders.delete_draft",
    PURCHASE_ORDERS_EXPORT_PDF: "purchase_orders.export_pdf",

    // 4.9 Goods Receipt
    GOODS_RECEIPTS_VIEW_LIST: "goods_receipts.view_list",
    GOODS_RECEIPTS_VIEW_DETAIL: "goods_receipts.view_detail",
    GOODS_RECEIPTS_CREATE: "goods_receipts.create",
    GOODS_RECEIPTS_ENTER_BATCH: "goods_receipts.enter_batch",
    GOODS_RECEIPTS_ENTER_SERIAL: "goods_receipts.enter_serial",
    GOODS_RECEIPTS_ENTER_EXPIRY: "goods_receipts.enter_expiry",
    GOODS_RECEIPTS_ASSIGN_LOCATION: "goods_receipts.assign_location",
    GOODS_RECEIPTS_EDIT_POSTED: "goods_receipts.edit_posted",
    GOODS_RECEIPTS_VOID_REVERSE: "goods_receipts.void_reverse",

    // 4.10 Customer Management
    CUSTOMERS_VIEW_LIST: "customers.view_list",
    CUSTOMERS_VIEW_DETAIL: "customers.view_detail",
    CUSTOMERS_VIEW_SO_HISTORY: "customers.view_so_history",
    CUSTOMERS_CREATE: "customers.create",
    CUSTOMERS_EDIT: "customers.edit",
    CUSTOMERS_SET_CREDIT_LIMIT: "customers.set_credit_limit",
    CUSTOMERS_DEACTIVATE: "customers.deactivate",
    CUSTOMERS_DELETE: "customers.delete",

    // 4.11 Sales Orders
    SALES_ORDERS_VIEW_LIST: "sales_orders.view_list",
    SALES_ORDERS_VIEW_DETAIL: "sales_orders.view_detail",
    SALES_ORDERS_CREATE_DRAFT: "sales_orders.create_draft",
    SALES_ORDERS_EDIT_DRAFT: "sales_orders.edit_draft",
    SALES_ORDERS_CONFIRM: "sales_orders.confirm",
    SALES_ORDERS_START_PICKING: "sales_orders.start_picking",
    SALES_ORDERS_COMPLETE_PICK: "sales_orders.complete_pick",
    SALES_ORDERS_CREATE_SHIPMENT: "sales_orders.create_shipment",
    SALES_ORDERS_MARK_DELIVERED: "sales_orders.mark_delivered",
    SALES_ORDERS_CANCEL: "sales_orders.cancel",
    SALES_ORDERS_PROCESS_RETURN: "sales_orders.process_return",
    SALES_ORDERS_OVERRIDE_CREDIT_LIMIT: "sales_orders.override_credit_limit",
    SALES_ORDERS_APPLY_DISCOUNT: "sales_orders.apply_discount",
    SALES_ORDERS_DELETE_DRAFT: "sales_orders.delete_draft",
    SALES_ORDERS_EXPORT_PDF: "sales_orders.export_pdf",

    // 4.12 Advanced Inventory Tracking
    BATCHES_VIEW_DETAILS_HISTORY: "batches.view_details_history",
    SERIALS_VIEW_HISTORY: "serials.view_history",
    INVENTORY_REPORT_EXPIRY_VIEW: "inventory.report.expiry_view",
    INVENTORY_QUARANTINE_MOVE: "inventory.quarantine.move",
    INVENTORY_QUARANTINE_RELEASE: "inventory.quarantine.release",
    INVENTORY_QUARANTINE_DISPOSE: "inventory.quarantine.dispose",
    INVENTORY_FEFO_OVERRIDE: "inventory.fefo.override",
    BATCHES_GENEALOGY_VIEW: "batches.genealogy.view",

    // 4.13 Kitting & Assembly
    KITS_VIEW_LIST: "kits.view_list",
    KITS_VIEW_BOM_DETAIL: "kits.view_bom_detail",
    KITS_VIEW_ASSEMBLY_AVAILABILITY: "kits.view_assembly_availability",
    KITS_EDIT_BOM: "kits.edit_bom",
    KITS_ASSEMBLY_PERFORM: "kits.assembly.perform",
    KITS_DISASSEMBLY_PERFORM: "kits.disassembly.perform",
    KITS_CREATE_PRODUCT: "kits.create_product",
    KITS_DELETE_PRODUCT: "kits.delete_product",

    // 4.14 Reports & Analytics
    REPORTS_DASHBOARD_KPI_VIEW: "reports.dashboard_kpi.view",
    REPORTS_INVENTORY_VALUATION_VIEW: "reports.inventory_valuation.view",
    REPORTS_STOCK_MOVEMENT_VIEW: "reports.stock_movement.view",
    REPORTS_AGING_DEAD_STOCK_VIEW: "reports.aging_dead_stock.view",
    REPORTS_EXPIRY_VIEW: "reports.expiry.view",
    REPORTS_LOW_STOCK_REORDER_VIEW: "reports.low_stock_reorder.view",
    REPORTS_PURCHASE_ANALYTICS_VIEW: "reports.purchase_analytics.view",
    REPORTS_SALES_ANALYTICS_VIEW: "reports.sales_analytics.view",
    REPORTS_EXPORT_CSV: "reports.export_csv",
    REPORTS_EXPORT_PDF: "reports.export_pdf",
    REPORTS_SCHEDULE_EMAIL: "reports.schedule_email",

    // 4.15 System Settings
    SETTINGS_COMPANY_VIEW: "settings.company.view",
    SETTINGS_COMPANY_EDIT: "settings.company.edit",
    SETTINGS_COMPANY_LOGO_UPLOAD: "settings.company.logo_upload",
    SETTINGS_CURRENCY_SET_DEFAULT: "settings.currency.set_default",
    SETTINGS_TAX_CONFIGURE_DEFAULT: "settings.tax.configure_default",
    SETTINGS_NUMBERING_SEQUENCES_CONFIGURE:
        "settings.numbering_sequences.configure",
    SETTINGS_UNITS_MANAGE: "settings.units.manage",
    SETTINGS_EMAIL_NOTIFICATIONS_CONFIGURE:
        "settings.email_notifications.configure",
    SETTINGS_ADJUSTMENT_THRESHOLD_SET: "settings.adjustment_threshold.set",
    SETTINGS_FISCAL_YEAR_CONFIGURE: "settings.fiscal_year.configure",
    SETTINGS_BACKUP_EXPORT: "settings.backup.export",
    SETTINGS_BACKUP_IMPORT_RESTORE: "settings.backup.import_restore",
    SETTINGS_ENV_VARS_MANAGE: "settings.env_vars.manage",
    SETTINGS_DB_MIGRATIONS_RUN: "settings.db_migrations.run",
    SETTINGS_PRISMA_STUDIO_ACCESS: "settings.prisma_studio.access",
    SETTINGS_FEATURE_FLAGS_TOGGLE: "settings.feature_flags.toggle",

    // 4.16 Audit Logs & Activity
    AUDIT_LOG_VIEW_OWN: "audit_log.view_own",
    AUDIT_LOG_VIEW_ALL: "audit_log.view_all",
    AUDIT_LOG_FILTER_BY_USER: "audit_log.filter_by_user",
    AUDIT_LOG_FILTER_BY_ENTITY: "audit_log.filter_by_entity",
    AUDIT_LOG_EXPORT: "audit_log.export",
    AUDIT_LOG_DELETE: "audit_log.delete",

    // 4.17 Mobile / Warehouse Interface
    MOBILE_RECEIVE_ACCESS: "mobile.receive.access",
    MOBILE_PICK_ACCESS: "mobile.pick.access",
    MOBILE_TRANSFER_ACCESS: "mobile.transfer.access",
    MOBILE_CYCLE_COUNT_ACCESS: "mobile.cycle_count.access",
    MOBILE_BARCODE_SCANNER_USE: "mobile.barcode_scanner.use",
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Higher number means higher authority.
 */
export const ROLE_HIERARCHY: Record<AppUserRole, number> = {
    VIEWER: 1,
    STAFF: 2,
    MANAGER: 3,
    ADMIN: 4,
    SUPER_ADMIN: 5,
};

interface PermissionRule {
    // Explicit allow-list for non-additive exceptions.
    allowedRoles?: readonly AppUserRole[];
    // True when extra business checks are required beyond role check.
    conditional?: boolean;
    // Minimum role needed for additive permissions.
    minRole?: AppUserRole;
}

/**
 * Returns true when the user's role is at least as high as the given minimum role.
 * This function is used to check if a user has permission to perform an action.
 * @param {AppUserRole} userRole - The user's role.
 * @param {AppUserRole} minRole - The minimum role required to perform the action.
 * @returns {boolean} True if the user's role is at least as high as the given minimum role, false otherwise.
 */
const atLeastRole = (userRole: AppUserRole, minRole: AppUserRole): boolean =>
    ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];

/**
 * Creates a permission rule with a minimum role requirement.
 * @param {AppUserRole} minRole - The minimum role required to access the feature.
 * @param {boolean} [conditional=false] - Whether additional business checks are required beyond role check.
 * @returns {PermissionRule} A permission rule object with the minimum role and conditional flag.
 */
const MIN = (minRole: AppUserRole, conditional = false): PermissionRule => ({
    minRole,
    conditional,
});

/**
 * Creates a permission rule that restricts access to a fixed list of roles.
 * @param {readonly AppUserRole[]} allowedRoles - A list of roles that are allowed to access the feature.
 * @param {boolean} [conditional=false] - Whether additional business checks are required beyond role check.
 * @returns {PermissionRule} A permission rule object with the allowed roles and conditional flag.
 */
const ONLY = (
    allowedRoles: readonly AppUserRole[],
    conditional = false
): PermissionRule => ({
    allowedRoles,
    conditional,
});

/**
 * Role matrix sourced from `StockSphere_Permissions_Reference.pdf`.
 *
 * Note on conditional permissions:
 * when `conditional: true`, role grants access to the feature entry point,
 * but domain rules (thresholds, ownership, status transitions, etc.) must
 * still be enforced in the service/server-function layer.
 */
export const PERMISSION_RULES: Record<AppPermission, PermissionRule> = {
    // Authentication & Session
    [PERMISSIONS.AUTH_REGISTER]: MIN("VIEWER"),
    [PERMISSIONS.AUTH_LOGIN]: MIN("VIEWER"),
    [PERMISSIONS.AUTH_LOGOUT]: MIN("VIEWER"),
    [PERMISSIONS.AUTH_SESSION_VIEW_OWN]: MIN("VIEWER"),
    [PERMISSIONS.AUTH_SESSION_REVOKE_OWN]: MIN("VIEWER"),
    [PERMISSIONS.AUTH_PASSWORD_RESET_REQUEST]: MIN("VIEWER"),
    [PERMISSIONS.AUTH_PASSWORD_RESET_CONFIRM]: MIN("VIEWER"),
    [PERMISSIONS.AUTH_SESSION_VIEW_OTHERS]: MIN("MANAGER", true),
    [PERMISSIONS.AUTH_SESSION_FORCE_EXPIRE_OTHERS]: MIN("MANAGER", true),

    // User Profile
    [PERMISSIONS.PROFILE_VIEW_OWN]: MIN("VIEWER"),
    [PERMISSIONS.PROFILE_EDIT_OWN]: MIN("VIEWER"),
    [PERMISSIONS.PROFILE_CHANGE_PASSWORD_OWN]: MIN("VIEWER"),
    [PERMISSIONS.PROFILE_CHANGE_EMAIL_OWN]: MIN("VIEWER"),
    [PERMISSIONS.PROFILE_SET_NOTIFICATIONS_OWN]: MIN("VIEWER"),
    [PERMISSIONS.PROFILE_VIEW_OTHERS]: MIN("MANAGER", true),
    [PERMISSIONS.PROFILE_EDIT_OTHERS]: MIN("ADMIN", true),

    // User Management
    [PERMISSIONS.USERS_VIEW_LIST]: MIN("MANAGER", true),
    [PERMISSIONS.USERS_VIEW_DETAIL_ACTIVITY]: MIN("MANAGER", true),
    [PERMISSIONS.USERS_INVITE_CREATE]: MIN("ADMIN", true),
    [PERMISSIONS.USERS_ASSIGN_VIEWER]: MIN("ADMIN", true),
    [PERMISSIONS.USERS_ASSIGN_STAFF]: MIN("ADMIN", true),
    [PERMISSIONS.USERS_ASSIGN_MANAGER]: MIN("ADMIN", true),
    [PERMISSIONS.USERS_ASSIGN_ADMIN]: ONLY(["SUPER_ADMIN", "ADMIN"], true),
    [PERMISSIONS.USERS_ASSIGN_SUPER_ADMIN]: ONLY(["SUPER_ADMIN"]),
    [PERMISSIONS.USERS_DEACTIVATE]: MIN("ADMIN", true),
    [PERMISSIONS.USERS_REACTIVATE]: MIN("ADMIN", true),
    [PERMISSIONS.USERS_DELETE_PERMANENT]: ONLY(["SUPER_ADMIN"], true),
    [PERMISSIONS.USERS_IMPERSONATE]: ONLY(["SUPER_ADMIN"]),

    // Products & Categories
    [PERMISSIONS.PRODUCTS_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.PRODUCTS_SEARCH_FILTER]: MIN("VIEWER"),
    [PERMISSIONS.PRODUCTS_VIEW_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.PRODUCTS_CREATE]: MIN("STAFF"),
    [PERMISSIONS.PRODUCTS_EDIT_DETAILS]: MIN("STAFF"),
    [PERMISSIONS.PRODUCTS_EDIT_PRICING]: MIN("MANAGER"),
    [PERMISSIONS.PRODUCTS_EDIT_REORDER_POINTS]: MIN("MANAGER"),
    [PERMISSIONS.PRODUCTS_EDIT_TRACKING_FLAGS]: MIN("MANAGER"),
    [PERMISSIONS.PRODUCTS_MARK_INACTIVE]: MIN("MANAGER"),
    [PERMISSIONS.PRODUCTS_DELETE_HARD]: MIN("ADMIN", true),
    [PERMISSIONS.PRODUCTS_EXPORT]: MIN("STAFF"),
    [PERMISSIONS.PRODUCTS_IMPORT_CSV]: MIN("ADMIN"),
    [PERMISSIONS.CATEGORIES_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.CATEGORIES_CREATE]: MIN("MANAGER"),
    [PERMISSIONS.CATEGORIES_EDIT]: MIN("MANAGER"),
    [PERMISSIONS.CATEGORIES_REPARENT]: MIN("MANAGER"),
    [PERMISSIONS.CATEGORIES_DELETE]: MIN("ADMIN", true),

    // Warehouses & Locations
    [PERMISSIONS.WAREHOUSES_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.WAREHOUSES_VIEW_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.WAREHOUSES_CREATE]: MIN("MANAGER"),
    [PERMISSIONS.WAREHOUSES_EDIT]: MIN("MANAGER"),
    [PERMISSIONS.WAREHOUSES_DEACTIVATE]: MIN("ADMIN"),
    [PERMISSIONS.WAREHOUSES_DELETE]: MIN("ADMIN", true),
    [PERMISSIONS.LOCATIONS_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.LOCATIONS_CREATE]: MIN("MANAGER"),
    [PERMISSIONS.LOCATIONS_EDIT]: MIN("MANAGER"),
    [PERMISSIONS.LOCATIONS_SET_TYPE]: MIN("MANAGER"),
    [PERMISSIONS.LOCATIONS_DEACTIVATE]: MIN("MANAGER"),
    [PERMISSIONS.LOCATIONS_DELETE]: MIN("ADMIN", true),

    // Inventory & Stock
    [PERMISSIONS.INVENTORY_STOCK_OVERVIEW]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_STOCK_BY_PRODUCT]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_STOCK_BY_LOCATION]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_RESERVED_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_BATCH_SERIAL_BREAKDOWN]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_EXPIRY_DETAILS]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_LOW_STOCK_ALERTS]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_ADJUST_SMALL]: MIN("STAFF"),
    [PERMISSIONS.INVENTORY_ADJUST_LARGE]: MIN("STAFF", true),
    [PERMISSIONS.INVENTORY_ADJUST_APPROVE]: MIN("MANAGER", true),
    [PERMISSIONS.INVENTORY_ADJUST_REJECT]: MIN("MANAGER", true),
    [PERMISSIONS.INVENTORY_TRANSFER_INITIATE]: MIN("STAFF"),
    [PERMISSIONS.INVENTORY_TRANSFER_COMPLETE]: MIN("STAFF"),
    [PERMISSIONS.INVENTORY_TRANSFER_CANCEL_IN_TRANSIT]: MIN("MANAGER"),
    [PERMISSIONS.INVENTORY_CYCLE_COUNT_PERFORM]: MIN("STAFF"),
    [PERMISSIONS.INVENTORY_CYCLE_COUNT_SUBMIT_DISCREPANCY]: MIN("STAFF"),
    [PERMISSIONS.INVENTORY_HISTORY_ADJUSTMENT_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_HISTORY_MOVEMENT_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_INITIAL_STOCK_ENTRY]: MIN("MANAGER", true),

    // Supplier Management
    [PERMISSIONS.SUPPLIERS_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.SUPPLIERS_VIEW_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.SUPPLIERS_VIEW_PO_HISTORY]: MIN("STAFF"),
    [PERMISSIONS.SUPPLIERS_CREATE]: MIN("STAFF"),
    [PERMISSIONS.SUPPLIERS_EDIT]: MIN("STAFF"),
    [PERMISSIONS.SUPPLIERS_MANAGE_PRODUCT_LINKS]: MIN("STAFF"),
    [PERMISSIONS.SUPPLIERS_DEACTIVATE]: MIN("MANAGER"),
    [PERMISSIONS.SUPPLIERS_DELETE]: MIN("ADMIN", true),

    // Purchase Orders
    [PERMISSIONS.PURCHASE_ORDERS_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.PURCHASE_ORDERS_VIEW_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.PURCHASE_ORDERS_CREATE_DRAFT]: MIN("STAFF"),
    [PERMISSIONS.PURCHASE_ORDERS_EDIT_DRAFT]: MIN("STAFF"),
    [PERMISSIONS.PURCHASE_ORDERS_SUBMIT_FOR_APPROVAL]: MIN("STAFF"),
    [PERMISSIONS.PURCHASE_ORDERS_APPROVE]: MIN("MANAGER"),
    [PERMISSIONS.PURCHASE_ORDERS_REJECT]: MIN("MANAGER"),
    [PERMISSIONS.PURCHASE_ORDERS_MARK_ORDERED]: MIN("STAFF"),
    [PERMISSIONS.PURCHASE_ORDERS_RECEIVE_GOODS]: MIN("STAFF"),
    [PERMISSIONS.PURCHASE_ORDERS_CANCEL]: MIN("MANAGER"),
    [PERMISSIONS.PURCHASE_ORDERS_DELETE_DRAFT]: MIN("MANAGER"),
    [PERMISSIONS.PURCHASE_ORDERS_EXPORT_PDF]: MIN("STAFF"),

    // Goods Receipt
    [PERMISSIONS.GOODS_RECEIPTS_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.GOODS_RECEIPTS_VIEW_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.GOODS_RECEIPTS_CREATE]: MIN("STAFF"),
    [PERMISSIONS.GOODS_RECEIPTS_ENTER_BATCH]: MIN("STAFF"),
    [PERMISSIONS.GOODS_RECEIPTS_ENTER_SERIAL]: MIN("STAFF"),
    [PERMISSIONS.GOODS_RECEIPTS_ENTER_EXPIRY]: MIN("STAFF"),
    [PERMISSIONS.GOODS_RECEIPTS_ASSIGN_LOCATION]: MIN("STAFF"),
    [PERMISSIONS.GOODS_RECEIPTS_EDIT_POSTED]: MIN("MANAGER", true),
    [PERMISSIONS.GOODS_RECEIPTS_VOID_REVERSE]: MIN("MANAGER", true),

    // Customer Management
    [PERMISSIONS.CUSTOMERS_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.CUSTOMERS_VIEW_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.CUSTOMERS_VIEW_SO_HISTORY]: MIN("STAFF"),
    [PERMISSIONS.CUSTOMERS_CREATE]: MIN("STAFF"),
    [PERMISSIONS.CUSTOMERS_EDIT]: MIN("STAFF"),
    [PERMISSIONS.CUSTOMERS_SET_CREDIT_LIMIT]: MIN("MANAGER"),
    [PERMISSIONS.CUSTOMERS_DEACTIVATE]: MIN("MANAGER"),
    [PERMISSIONS.CUSTOMERS_DELETE]: MIN("ADMIN", true),

    // Sales Orders
    [PERMISSIONS.SALES_ORDERS_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.SALES_ORDERS_VIEW_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.SALES_ORDERS_CREATE_DRAFT]: MIN("STAFF"),
    [PERMISSIONS.SALES_ORDERS_EDIT_DRAFT]: MIN("STAFF"),
    [PERMISSIONS.SALES_ORDERS_CONFIRM]: MIN("STAFF"),
    [PERMISSIONS.SALES_ORDERS_START_PICKING]: MIN("STAFF"),
    [PERMISSIONS.SALES_ORDERS_COMPLETE_PICK]: MIN("STAFF"),
    [PERMISSIONS.SALES_ORDERS_CREATE_SHIPMENT]: MIN("STAFF"),
    [PERMISSIONS.SALES_ORDERS_MARK_DELIVERED]: MIN("STAFF"),
    [PERMISSIONS.SALES_ORDERS_CANCEL]: MIN("MANAGER"),
    [PERMISSIONS.SALES_ORDERS_PROCESS_RETURN]: MIN("MANAGER"),
    [PERMISSIONS.SALES_ORDERS_OVERRIDE_CREDIT_LIMIT]: MIN("MANAGER"),
    [PERMISSIONS.SALES_ORDERS_APPLY_DISCOUNT]: MIN("MANAGER"),
    [PERMISSIONS.SALES_ORDERS_DELETE_DRAFT]: MIN("MANAGER"),
    [PERMISSIONS.SALES_ORDERS_EXPORT_PDF]: MIN("STAFF"),

    // Advanced Inventory Tracking
    [PERMISSIONS.BATCHES_VIEW_DETAILS_HISTORY]: MIN("VIEWER"),
    [PERMISSIONS.SERIALS_VIEW_HISTORY]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_REPORT_EXPIRY_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.INVENTORY_QUARANTINE_MOVE]: MIN("STAFF"),
    [PERMISSIONS.INVENTORY_QUARANTINE_RELEASE]: MIN("MANAGER", true),
    [PERMISSIONS.INVENTORY_QUARANTINE_DISPOSE]: MIN("MANAGER", true),
    [PERMISSIONS.INVENTORY_FEFO_OVERRIDE]: MIN("MANAGER", true),
    [PERMISSIONS.BATCHES_GENEALOGY_VIEW]: MIN("VIEWER"),

    // Kitting & Assembly
    [PERMISSIONS.KITS_VIEW_LIST]: MIN("VIEWER"),
    [PERMISSIONS.KITS_VIEW_BOM_DETAIL]: MIN("VIEWER"),
    [PERMISSIONS.KITS_VIEW_ASSEMBLY_AVAILABILITY]: MIN("VIEWER"),
    [PERMISSIONS.KITS_EDIT_BOM]: MIN("MANAGER"),
    [PERMISSIONS.KITS_ASSEMBLY_PERFORM]: MIN("STAFF"),
    [PERMISSIONS.KITS_DISASSEMBLY_PERFORM]: MIN("MANAGER"),
    [PERMISSIONS.KITS_CREATE_PRODUCT]: MIN("MANAGER"),
    [PERMISSIONS.KITS_DELETE_PRODUCT]: MIN("ADMIN", true),

    // Reports & Analytics
    [PERMISSIONS.REPORTS_DASHBOARD_KPI_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_INVENTORY_VALUATION_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_STOCK_MOVEMENT_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_AGING_DEAD_STOCK_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_EXPIRY_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_LOW_STOCK_REORDER_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_PURCHASE_ANALYTICS_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_SALES_ANALYTICS_VIEW]: MIN("VIEWER"),
    [PERMISSIONS.REPORTS_EXPORT_CSV]: MIN("STAFF"),
    [PERMISSIONS.REPORTS_EXPORT_PDF]: MIN("STAFF"),
    [PERMISSIONS.REPORTS_SCHEDULE_EMAIL]: MIN("MANAGER"),

    // System Settings
    [PERMISSIONS.SETTINGS_COMPANY_VIEW]: MIN("MANAGER", true),
    [PERMISSIONS.SETTINGS_COMPANY_EDIT]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_COMPANY_LOGO_UPLOAD]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_CURRENCY_SET_DEFAULT]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_TAX_CONFIGURE_DEFAULT]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_NUMBERING_SEQUENCES_CONFIGURE]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_UNITS_MANAGE]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_EMAIL_NOTIFICATIONS_CONFIGURE]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_ADJUSTMENT_THRESHOLD_SET]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_FISCAL_YEAR_CONFIGURE]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_BACKUP_EXPORT]: MIN("ADMIN"),
    [PERMISSIONS.SETTINGS_BACKUP_IMPORT_RESTORE]: ONLY(["SUPER_ADMIN"]),
    [PERMISSIONS.SETTINGS_ENV_VARS_MANAGE]: ONLY(["SUPER_ADMIN"]),
    [PERMISSIONS.SETTINGS_DB_MIGRATIONS_RUN]: ONLY(["SUPER_ADMIN"]),
    [PERMISSIONS.SETTINGS_PRISMA_STUDIO_ACCESS]: ONLY(["SUPER_ADMIN"]),
    [PERMISSIONS.SETTINGS_FEATURE_FLAGS_TOGGLE]: ONLY(["SUPER_ADMIN"]),

    // Audit Logs & Activity
    [PERMISSIONS.AUDIT_LOG_VIEW_OWN]: MIN("VIEWER"),
    [PERMISSIONS.AUDIT_LOG_VIEW_ALL]: MIN("MANAGER"),
    [PERMISSIONS.AUDIT_LOG_FILTER_BY_USER]: MIN("MANAGER"),
    [PERMISSIONS.AUDIT_LOG_FILTER_BY_ENTITY]: MIN("MANAGER"),
    [PERMISSIONS.AUDIT_LOG_EXPORT]: MIN("ADMIN"),
    [PERMISSIONS.AUDIT_LOG_DELETE]: ONLY([]),

    // Mobile / Warehouse Interface
    [PERMISSIONS.MOBILE_RECEIVE_ACCESS]: MIN("STAFF"),
    [PERMISSIONS.MOBILE_PICK_ACCESS]: MIN("STAFF"),
    [PERMISSIONS.MOBILE_TRANSFER_ACCESS]: MIN("STAFF"),
    [PERMISSIONS.MOBILE_CYCLE_COUNT_ACCESS]: MIN("STAFF"),
    [PERMISSIONS.MOBILE_BARCODE_SCANNER_USE]: MIN("STAFF"),
};

/**
 * Core permission check used by both server guards and UI feature checks.
 */
export const roleHasPermission = (
    role: AppUserRole,
    permission: AppPermission
): boolean => {
    const rule = PERMISSION_RULES[permission];

    if (rule.allowedRoles) {
        return rule.allowedRoles.includes(role);
    }

    if (rule.minRole) {
        return atLeastRole(role, rule.minRole);
    }

    return false;
};

/**
 * Materialized list of permissions for each role.
 * Useful for debugging, docs, and UI introspection.
 */
export const ROLE_PERMISSIONS: Record<AppUserRole, readonly AppPermission[]> = {
    SUPER_ADMIN: [],
    ADMIN: [],
    MANAGER: [],
    STAFF: [],
    VIEWER: [],
};

for (const role of USER_ROLES) {
    ROLE_PERMISSIONS[role] = (
        Object.values(PERMISSIONS) as AppPermission[]
    ).filter((permission) => roleHasPermission(role, permission));
}

/**
 * Permissions that require additional domain checks beyond role.
 */
export const CONDITIONAL_PERMISSIONS = new Set<AppPermission>(
    (Object.entries(PERMISSION_RULES) as [AppPermission, PermissionRule][])
        .filter(([, rule]) => rule.conditional)
        .map(([permission]) => permission)
);
