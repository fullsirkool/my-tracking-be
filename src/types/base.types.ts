import { ApiProperty } from '@nestjs/swagger';
import { IsInterger } from 'src/decorators/validator.decorator';

export type BasePaingDto = {
  page: number;
};

export class BasePagingResponse<T> {
  data: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElement: number;
}

export class BasePagingDto {
  @ApiProperty({
    required: false,
    description: 'Number of page',
  })
  @IsInterger
  readonly page: number = 1;
  @ApiProperty({
    required: false,
    description: 'Number of records per page',
  })
  @IsInterger
  readonly size: number = 9;
}
