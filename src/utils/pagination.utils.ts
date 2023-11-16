import { BasePagingDto } from 'src/types/base.types';

export const getDefaultPaginationReponse = (
  pagination: Partial<BasePagingDto>,
  count: number,
) => {
  const { page, size } = pagination;

  return {
    page,
    size,
    totalPages: Math.ceil(count / size) || 0,
    totalElement: count,
  };
};
