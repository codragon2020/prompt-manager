export type DiffLine =
  | { type: 'equal'; text: string }
  | { type: 'add'; text: string }
  | { type: 'del'; text: string };

// Simple LCS-based line diff (good enough for prompt text)
export function diffLines(a: string, b: string): DiffLine[] {
  const A = a.split(/\r?\n/);
  const B = b.split(/\r?\n/);

  const n = A.length;
  const m = B.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        A[i] === B[j]
          ? 1 + dp[i + 1][j + 1]
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: 'equal', text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: A[i] });
      i++;
    } else {
      out.push({ type: 'add', text: B[j] });
      j++;
    }
  }

  while (i < n) {
    out.push({ type: 'del', text: A[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: 'add', text: B[j] });
    j++;
  }

  return out;
}
