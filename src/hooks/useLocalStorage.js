import { useEffect, useState } from 'react';

// state をローカルストレージと同期するフック。
// 読み込みや保存に失敗しても（プライベートモード・容量超過など）、アプリ自体は動き続ける。
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed = JSON.parse(raw);
      // 初期値が配列なのに配列以外が入っていた場合は、壊れたデータとみなして初期値に戻す
      if (Array.isArray(initialValue) && !Array.isArray(parsed)) return initialValue;
      return parsed;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('ローカルストレージへの保存に失敗しました', error);
    }
  }, [key, value]);

  return [value, setValue];
}
