export const getErrorMessage = (error: unknown, fallback = 'Đã xảy ra lỗi.'): string => (
  error instanceof Error ? error.message : fallback
);
