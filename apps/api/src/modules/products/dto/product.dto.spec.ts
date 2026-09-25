import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { CreateProductDto } from './product.dto';

describe('CreateProductDto', () => {
  const valid = {
    name: 'Paracetamol 500mg',
    sellingPrice: 10,
    purchasePrice: 5,
    categoryId: '3e8e8709-769c-4623-a8e7-705d60030ebe',
    taxRate: 10,
    unit: 'piece',
  };

  it('accepts a complete valid payload', () => {
    const dto = Object.assign(new CreateProductDto(), valid);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects when name is missing', () => {
    const dto = Object.assign(new CreateProductDto(), { sellingPrice: 10 });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects when name is empty', () => {
    const dto = Object.assign(new CreateProductDto(), { ...valid, name: '' });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects when sellingPrice is missing', () => {
    const dto = Object.assign(new CreateProductDto(), { name: 'X' });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'sellingPrice')).toBe(true);
  });

  it('rejects a negative sellingPrice', () => {
    const dto = Object.assign(new CreateProductDto(), { ...valid, sellingPrice: -1 });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'sellingPrice')).toBe(true);
  });

  it('rejects a non-numeric sellingPrice', () => {
    const dto = Object.assign(new CreateProductDto(), { ...valid, sellingPrice: 'ten' as never });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'sellingPrice')).toBe(true);
  });

  it('accepts a zero sellingPrice', () => {
    const dto = Object.assign(new CreateProductDto(), { ...valid, sellingPrice: 0 });
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects a taxRate above 100', () => {
    const dto = Object.assign(new CreateProductDto(), { ...valid, taxRate: 101 });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'taxRate')).toBe(true);
  });

  it('rejects an invalid category id', () => {
    const dto = Object.assign(new CreateProductDto(), { ...valid, categoryId: 'not-a-uuid' });
    const errors = validateSync(dto);
    expect(errors.some((e) => e.property === 'categoryId')).toBe(true);
  });
});