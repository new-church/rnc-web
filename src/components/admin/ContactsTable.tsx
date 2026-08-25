import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

export type ContactRow = {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  tags: string[];
};

const columnHelper = createColumnHelper<ContactRow>();

type Props = {
  contacts: ContactRow[];
};

export default function ContactsTable({ contacts }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "displayName", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => [
      columnHelper.accessor("displayName", {
        header: "Name",
        cell: (info) => (
          <a
            href={`/admin/contacts/${info.row.original.id}`}
            className="font-medium text-accent-primary-strong no-underline hover:underline"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-ink-muted">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => (
          <span className="text-ink-muted">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("tags", {
        header: "Tags",
        cell: (info) => {
          const tags = info.getValue();
          if (!tags.length) {
            return <span className="text-ink-muted">—</span>;
          }
          return (
            <ul className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <li
                  key={t}
                  className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-display text-violet-900"
                >
                  {t}
                </li>
              ))}
            </ul>
          );
        },
        enableSorting: false,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: contacts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search contacts…"
          className="font-body text-base text-text-body px-4 py-2.5 rounded-md border border-border-strong bg-white outline-none focus:border-accent-primary focus:shadow-glow min-w-[220px]"
        />
        <a
          href="/admin/contacts/new"
          className="inline-flex items-center justify-center font-display font-semibold tracking-[0.04em] rounded-pill bg-accent-primary text-text-on-accent px-[26px] pt-[13px] pb-[11px] text-[15px] leading-none no-underline hover:bg-accent-primary-strong"
        >
          Add contact
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-soft bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-soft bg-violet-50 font-display text-text-heading">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-semibold">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-ink-muted"
                >
                  No contacts match.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border-soft last:border-0 hover:bg-violet-50/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
        <span>
          {table.getFilteredRowModel().rows.length} contact
          {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-border-strong px-3 py-1.5 font-display text-sm disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-border-strong px-3 py-1.5 font-display text-sm disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
