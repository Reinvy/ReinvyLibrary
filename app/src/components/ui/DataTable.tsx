interface DataTableProps {
  headers: string[];
  rows: string[][];
}

/** Warm-bordered GFM table with a sage header tint, horizontal scroll. */
export default function DataTable({ headers, rows }: DataTableProps) {
  return (
    <div className="my-6 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[480px] border-collapse text-sm text-ink-muted">
        <thead>
          <tr className="bg-sage/60 text-ink">
            {headers.map((h) => (
              <th key={h} className="border-b border-line px-4 py-2.5 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 ? "bg-paper/50" : "bg-card"}>
              {row.map((cell, j) => (
                <td key={j} className="border-b border-line/60 px-4 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
