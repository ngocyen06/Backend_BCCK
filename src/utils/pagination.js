// OWNER: Yến
// Chuẩn hoá phân trang: mặc định page=1, pageSize=10, tối đa 100 (CONTRACT.md:25).

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Chuẩn hoá tham số phân trang từ query.
 * @param {unknown} page
 * @param {unknown} pageSize
 * @returns {{ page: number, pageSize: number, offset: number }}
 */
function normalizePagination(page, pageSize) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedSize = Number.parseInt(pageSize, 10);

  const safePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;
  let safeSize = Number.isInteger(parsedSize) && parsedSize > 0 ? parsedSize : DEFAULT_PAGE_SIZE;
  if (safeSize > MAX_PAGE_SIZE) safeSize = MAX_PAGE_SIZE;

  return { page: safePage, pageSize: safeSize, offset: (safePage - 1) * safeSize };
}

/**
 * Đóng gói danh sách theo định dạng response chuẩn.
 * @template T
 * @param {T[]} items
 * @param {{ page: number, pageSize: number, total: number }} meta
 * @returns {{ items: T[], page: number, pageSize: number, total: number }}
 */
function paginated(items, meta) {
  return {
    items: Array.isArray(items) ? items : [],
    page: meta.page,
    pageSize: meta.pageSize,
    total: Number(meta.total) || 0,
  };
}

module.exports = { normalizePagination, paginated, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
