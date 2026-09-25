import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({ name: 'pharmacyCurrency', standalone: true })
export class PharmacyCurrencyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    currencySymbol = 'SAR',
    decimals = 2,
  ): string {
    const num = Number(value ?? 0);
    if (Number.isNaN(num)) return `${currencySymbol} 0`;
    return `${currencySymbol} ${num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
}