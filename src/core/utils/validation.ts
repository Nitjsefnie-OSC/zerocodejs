export function validateData(data?: unknown): boolean {
  const target = data as { page?: Array<{ id?: unknown; part_id?: unknown }> } | undefined;

  // 基本的な構造チェック
  if (!target || !target.page || !Array.isArray(target.page)) return false;

  // 各コンポーネントの必須フィールドチェック
  for (const component of target.page) {
    if (!component.id || !component.part_id) {
      return false;
    }
  }

  return true;
}
