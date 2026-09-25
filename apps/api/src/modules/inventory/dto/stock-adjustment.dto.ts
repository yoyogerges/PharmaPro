import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { InventoryMovementTypes, type InventoryMovementType } from '@pharmapro/shared';

export class CreateStockAdjustmentDto {
  @IsUUID('4')
  productId!: string;

  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  @IsEnum(InventoryMovementTypes)
  type!: InventoryMovementType;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}