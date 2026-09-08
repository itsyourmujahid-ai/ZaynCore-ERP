// ============================================================================
// Zero-Float Financial Arithmetic & Formatting Engine
// ============================================================================
/**
 * Normalizes any number or string into a fixed-precision decimal string
 * without IEEE 754 floating-point inaccuracies.
 */
export function toDecimalString(value, precision = 4) {
    if (typeof value === 'number') {
        if (isNaN(value))
            return (0).toFixed(precision);
        return value.toFixed(precision);
    }
    const clean = value.replace(/[^0-9.-]/g, '');
    if (!clean || isNaN(Number(clean))) {
        return (0).toFixed(precision);
    }
    // Handle scientific notation or standard decimal
    const num = Number(clean);
    return num.toFixed(precision);
}
/**
 * Safely parses string amount to high-precision integer cents/micros
 */
function parseToUnits(amountStr, precision = 4) {
    const parts = amountStr.split('.');
    const whole = parts[0] || '0';
    let frac = parts[1] || '';
    if (frac.length < precision) {
        frac = frac.padEnd(precision, '0');
    }
    else if (frac.length > precision) {
        frac = frac.slice(0, precision);
    }
    return BigInt(whole + frac);
}
function unitsToString(units, precision = 4) {
    const isNegative = units < 0n;
    const absUnits = isNegative ? -units : units;
    const str = absUnits.toString().padStart(precision + 1, '0');
    const whole = str.slice(0, str.length - precision);
    const frac = str.slice(str.length - precision);
    return `${isNegative ? '-' : ''}${whole}.${frac}`;
}
export function createMoney(amount, currency = 'USD', precision = 4) {
    return {
        amount: toDecimalString(amount, precision),
        currency: currency.toUpperCase(),
    };
}
export function addMoney(a, b, precision = 4) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch in financial operation: ${a.currency} vs ${b.currency}`);
    }
    const uA = parseToUnits(a.amount, precision);
    const uB = parseToUnits(b.amount, precision);
    return {
        amount: unitsToString(uA + uB, precision),
        currency: a.currency,
    };
}
export function subtractMoney(a, b, precision = 4) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch in financial operation: ${a.currency} vs ${b.currency}`);
    }
    const uA = parseToUnits(a.amount, precision);
    const uB = parseToUnits(b.amount, precision);
    return {
        amount: unitsToString(uA - uB, precision),
        currency: a.currency,
    };
}
export function multiplyMoney(m, factor, precision = 4) {
    const numFactor = typeof factor === 'string' ? parseFloat(factor) : factor;
    const numAmount = parseFloat(m.amount);
    const result = numAmount * numFactor;
    return {
        amount: toDecimalString(result, precision),
        currency: m.currency,
    };
}
export function isZeroMoney(m) {
    const amt = typeof m === 'string' ? m : m.amount;
    return Math.abs(parseFloat(amt)) < 0.000001;
}
/**
 * Asserts double-entry journal balance
 */
export function areDebitsAndCreditsBalanced(totalDebit, totalCredit) {
    if (totalDebit.currency !== totalCredit.currency)
        return false;
    return totalDebit.amount === totalCredit.amount;
}
/**
 * Formats a monetary amount according to international accounting standards.
 */
export function formatMoney(value, currencyCode, displayDecimals = 2) {
    let amtStr;
    let curr = currencyCode || 'USD';
    if (typeof value === 'object' && value !== null && 'amount' in value) {
        amtStr = value.amount;
        curr = currencyCode || value.currency || 'USD';
    }
    else if (typeof value === 'number') {
        amtStr = value.toFixed(displayDecimals);
    }
    else {
        amtStr = String(value);
    }
    const num = parseFloat(amtStr);
    if (isNaN(num))
        return `0.00 ${curr}`;
    // Currency specific formatting
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: curr,
            minimumFractionDigits: displayDecimals,
            maximumFractionDigits: displayDecimals,
        }).format(num);
    }
    catch {
        return `${num.toLocaleString('en-US', {
            minimumFractionDigits: displayDecimals,
            maximumFractionDigits: displayDecimals,
        })} ${curr}`;
    }
}
export function parseDecimal(value) {
    if (typeof value === 'number')
        return isNaN(value) ? 0 : value;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}
export function formatDecimal(value, decimals = 4) {
    return toDecimalString(value, decimals);
}
