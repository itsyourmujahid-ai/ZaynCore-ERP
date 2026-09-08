// ============================================================================
// Enterprise Unit of Measure (UOM) & Cross-Unit Conversion Engine
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbUomConversion } from '@/database/types';

export interface UomConversionResult {
  convertedQuantity: string;
  conversionRate: string;
  sourceUom: string;
  targetUom: string;
  isDirectConversion: boolean;
  formula: string;
}

export interface GraphConversionResult {
  convertedQuantity: number;
  effectiveMultiplier: number;
  path: string[];
}

export class UomConversionEngine {
  /**
   * Static Graph BFS Conversion Algorithm supporting multi-tier transitive UOM conversions
   */
  public static convert(
    quantity: number,
    fromUnit: string,
    toUnit: string,
    conversions: DbUomConversion[]
  ): GraphConversionResult {
    const fromCode = fromUnit.trim().toUpperCase();
    const toCode = toUnit.trim().toUpperCase();

    if (quantity <= 0) {
      throw new Error('Quantity must be a positive number greater than zero.');
    }

    if (fromCode === toCode) {
      return {
        convertedQuantity: quantity,
        effectiveMultiplier: 1,
        path: [fromCode],
      };
    }

    // Build Adjacency Graph: unit -> array of { nextUnit, multiplier }
    const graph: Map<string, Array<{ to: string; factor: number }>> = new Map();

    const addEdge = (u1: string, u2: string, factor: number) => {
      if (!graph.has(u1)) graph.set(u1, []);
      graph.get(u1)!.push({ to: u2, factor });
    };

    for (const c of conversions) {
      const u1 = c.fromUomCode.toUpperCase();
      const u2 = c.toUomCode.toUpperCase();
      const mult = parseFloat(c.multiplier);
      if (!isNaN(mult) && mult > 0) {
        addEdge(u1, u2, mult);
        addEdge(u2, u1, 1 / mult);
      }
    }

    // BFS Search for shortest path from fromCode to toCode
    const queue: Array<{ current: string; totalFactor: number; path: string[] }> = [
      { current: fromCode, totalFactor: 1, path: [fromCode] },
    ];
    const visited = new Set<string>([fromCode]);

    while (queue.length > 0) {
      const { current, totalFactor, path } = queue.shift()!;

      if (current === toCode) {
        const converted = quantity * totalFactor;
        return {
          convertedQuantity: Math.round(converted * 10000) / 10000,
          effectiveMultiplier: totalFactor,
          path,
        };
      }

      const neighbors = graph.get(current) || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({
            current: edge.to,
            totalFactor: totalFactor * edge.factor,
            path: [...path, edge.to],
          });
        }
      }
    }

    throw new Error(
      `No conversion path found between '${fromCode}' and '${toCode}'. Please define a conversion rule.`
    );
  }

  /**
   * Converts a given quantity from a source UOM to a target UOM for a company.
   */
  public convertQuantity(
    companyId: string,
    fromUomCode: string,
    toUomCode: string,
    quantity: number | string,
    ctx?: TenantContext
  ): UomConversionResult {
    const fromCode = fromUomCode.trim().toUpperCase();
    const toCode = toUomCode.trim().toUpperCase();
    const qtyNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    if (isNaN(qtyNum)) {
      throw new Error(`Invalid numeric quantity '${quantity}' for UOM conversion.`);
    }

    if (fromCode === toCode) {
      return {
        convertedQuantity: qtyNum.toFixed(4),
        conversionRate: '1.0000',
        sourceUom: fromCode,
        targetUom: toCode,
        isDirectConversion: true,
        formula: `${qtyNum} ${fromCode} = ${qtyNum} ${toCode}`,
      };
    }

    const conversions = db.getUomConversions(companyId, ctx);

    try {
      const graphResult = UomConversionEngine.convert(qtyNum, fromCode, toCode, conversions);
      return {
        convertedQuantity: graphResult.convertedQuantity.toFixed(4),
        conversionRate: graphResult.effectiveMultiplier.toFixed(4),
        sourceUom: fromCode,
        targetUom: toCode,
        isDirectConversion: graphResult.path.length === 2,
        formula: `${qtyNum} ${fromCode} -> ${graphResult.convertedQuantity.toFixed(4)} ${toCode} (${graphResult.path.join(' -> ')})`,
      };
    } catch {
      // Fallback to standard UOM units of measure in database
      const allUoms = db.getUnitsOfMeasure({ companyId } as any);
      const fromUom = allUoms.find((u) => u.code.toUpperCase() === fromCode);
      const toUom = allUoms.find((u) => u.code.toUpperCase() === toCode);

      if (fromUom && toUom && fromUom.category === toUom.category) {
        const fromFactor = parseFloat(fromUom.conversionFactor || '1');
        const toFactor = parseFloat(toUom.conversionFactor || '1');
        if (fromFactor > 0 && toFactor > 0) {
          const baseQty = qtyNum * fromFactor;
          const targetQty = baseQty / toFactor;
          const rate = fromFactor / toFactor;
          return {
            convertedQuantity: targetQty.toFixed(4),
            conversionRate: rate.toFixed(4),
            sourceUom: fromCode,
            targetUom: toCode,
            isDirectConversion: false,
            formula: `${qtyNum} ${fromCode} -> ${baseQty.toFixed(4)} Base -> ${targetQty.toFixed(4)} ${toCode}`,
          };
        }
      }

      throw new Error(
        `No valid UOM conversion path found between '${fromCode}' and '${toCode}' for company '${companyId}'. Please register a conversion rule.`
      );
    }
  }

  /**
   * Validates a candidate UOM conversion rule before saving to prevent circular or invalid definitions.
   */
  public validateConversionRule(
    companyId: string,
    fromUomCode: string,
    toUomCode: string,
    multiplier: string
  ): { isValid: boolean; error?: string } {
    const fromCode = fromUomCode.trim().toUpperCase();
    const toCode = toUomCode.trim().toUpperCase();

    if (!fromCode || !toCode) {
      return { isValid: false, error: 'Both Source and Target UOM codes are required.' };
    }
    if (fromCode === toCode) {
      return { isValid: false, error: 'Source and Target UOM cannot be the same unit.' };
    }

    const multNum = parseFloat(multiplier);
    if (isNaN(multNum) || multNum <= 0) {
      return { isValid: false, error: `Conversion multiplier must be a positive number greater than 0. Received '${multiplier}'.` };
    }

    const existing = db.getUomConversions(companyId);
    const directExists = existing.some(
      (c) => c.fromUomCode.toUpperCase() === fromCode && c.toUomCode.toUpperCase() === toCode
    );
    if (directExists) {
      return { isValid: false, error: `A conversion rule between '${fromCode}' and '${toCode}' is already registered.` };
    }

    return { isValid: true };
  }
}

export const uomConversionEngine = new UomConversionEngine();
