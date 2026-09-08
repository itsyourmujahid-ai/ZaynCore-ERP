// ============================================================================
// Standardized Enterprise Domain & Security Exception Classes
// ============================================================================
export class BaseDomainError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 400, details) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
export class TenantViolationError extends BaseDomainError {
    constructor(message = 'Cross-tenant data access violation detected', details) {
        super(message, 'TENANT_ISOLATION_VIOLATION', 403, details);
    }
}
export class UnauthorizedAccessError extends BaseDomainError {
    constructor(requiredPermission) {
        super(requiredPermission
            ? `User lacks the required permission: '${requiredPermission}'`
            : 'User is unauthorized to perform this operation', 'UNAUTHORIZED_PERMISSION', 403);
    }
}
export class ModuleDisabledError extends BaseDomainError {
    constructor(moduleKey, companyTier) {
        super(`Module '${moduleKey}' is not enabled for company tier '${companyTier}'`, 'MODULE_DISABLED_FOR_TIER', 403);
    }
}
export class PeriodClosedError extends BaseDomainError {
    constructor(periodName, status = 'closed') {
        super(`Cannot post transaction. Accounting period '${periodName}' is ${status.toUpperCase()}.`, 'ACCOUNTING_PERIOD_LOCKED', 422);
    }
}
export class UnbalancedJournalError extends BaseDomainError {
    constructor(debit, credit, currency) {
        super(`Double-entry imbalance: Total Debit (${debit} ${currency}) != Total Credit (${credit} ${currency})`, 'UNBALANCED_JOURNAL_ENTRY', 422);
    }
}
export class ImmutableRecordError extends BaseDomainError {
    constructor(entity, id) {
        super(`Posted entity '${entity}' with ID '${id}' is immutable and cannot be updated or deleted. A reversal is required.`, 'IMMUTABLE_RECORD_MODIFICATION_PROHIBITED', 422);
    }
}
export class DomainValidationError extends BaseDomainError {
    constructor(message, details) {
        super(message, 'DOMAIN_VALIDATION_ERROR', 400, details);
    }
}
export class ValidationError extends BaseDomainError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}
export class NotFoundError extends BaseDomainError {
    constructor(entity, id) {
        super(id ? `Entity '${entity}' with ID '${id}' was not found.` : `Entity '${entity}' not found.`, 'ENTITY_NOT_FOUND', 404);
    }
}
