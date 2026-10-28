import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import { AlertCircle, Braces, Check, ChevronLeft, ChevronRight, CircleHelp, Database, FileCode2, LogOut, Menu, Moon, Plus, RefreshCw, Search, Sun, Table2, Trash2, X } from 'lucide-react';
import './styles/theme.css';

/* ========================= SUPABASE CONFIG =========================
   Replace only the anon key before deployment. Never add a service role key. */
const SUPABASE_URL = 'https://jcatwogscxvnoyqpdtdi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4_WXXwsR4Ipvw6ItwEF8OA_jipTTnnt';
const PAGE_SIZE = 50;
const DISCOVERY_INTERVAL_MS = 15_000;
const ALLOWED_EMAIL = 'elabdm965@gmail.com';

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { lock: async (_name, _acquireTimeout, fn) => fn() }
});

interface ViewerColumn { name: string; data_type: string; position: number; }
interface ViewerTable { table_name: string; columns: ViewerColumn[]; rowCount?: number; }
interface Toast { id: number; message: string; }
type Locale = 'ar' | 'en';
type SortState = { column: string; direction: 'asc' | 'desc' } | null;
const byId = (list: Record<string, unknown>[]) => [...list].sort((a, b) => { const x = Number(a.id); const y = Number(b.id); return Number.isNaN(x) || Number.isNaN(y) ? 0 : x - y; });

function cleanRowData(rowData: Record<string, string>): Record<string, unknown> { const skip = new Set(['id', 'created_at', 'updated_at']); return Object.fromEntries(Object.entries(rowData).filter(([key]) => !skip.has(key.toLowerCase())).map(([key, value]) => [key, value.trim() === '' ? null : value])); }

const copy = {
  ar: { brand: 'عارض البيانات', sub: 'عرض وتعديل · Supabase', tables: 'الجداول', overview: 'نظرة عامة', connection: 'حالة الاتصال', connected: 'متصل', offline: 'غير متصل', setupTitle: 'أضف مفتاح anon لبدء الاتصال', setup: 'هذا العرض جاهز للاتصال بقاعدة Supabase. استبدل القيمة التجريبية في كتلة الإعدادات أعلى App.tsx بمفتاح anon العام فقط.', sql: 'SQL المطلوب', table: 'الجدول', rows: 'الصفوف', columns: 'الأعمدة', showing: 'عرض', of: 'من', search: 'ابحث في الصفحة الحالية…', previous: 'السابق', next: 'التالي', noTables: 'لا توجد جداول متاحة', noTablesCopy: 'سيتم تحديث القائمة تلقائياً عند ظهور جداول جديدة.', noRows: 'لا توجد بيانات', noRowsCopy: 'هذا الجدول لا يحتوي على صفوف في الصفحة الحالية.', loading: 'جاري تحميل البيانات…', error: 'تعذر تحميل البيانات', permission: 'تحقق من صلاحيات القراءة وسياسة RLS الخاصة بالجدول.', live: 'مباشر', offlineLive: 'متوقف', refresh: 'تحديث', light: 'الوضع الفاتح', dark: 'الوضع الداكن', language: 'English', copySql: 'SQL لـ Supabase', discovered: 'تم اكتشاف جدول جديد', null: 'فارغ', showMore: 'عرض المزيد', showLess: 'عرض أقل', configMissing: 'الإعداد غير مكتمل', close: 'إغلاق', sortAsc: 'ترتيب تصاعدي', sortDesc: 'ترتيب تنازلي', updated: 'تحديث مباشر', inserted: 'صف جديد', deleted: 'تم حذف صف', addRow: 'إضافة صف', save: 'حفظ', cancel: 'إلغاء', saving: 'جاري الحفظ…', insertError: 'فشل إضافة الصف', editRow: 'تعديل الصف', updateError: 'فشل تعديل الصف', noId: 'لا يمكن تعديل أو حذف صف بدون id', deleteRow: 'حذف الصف', confirmDelete: 'تأكيد حذف هذا الصف؟', deleteError: 'فشل حذف الصف', addColumn: 'إضافة عمود', columnName: 'اسم العمود الجديد', columnType: 'نوع العمود: text, integer, bigint, numeric, boolean, jsonb, date, timestamptz, uuid', columnAdded: 'تمت إضافة العمود', addColumnError: 'فشل إضافة العمود', logout: 'تسجيل الخروج', loginTitle: 'تسجيل الدخول', loginSub: 'أدخل بياناتك للوصول إلى عارض البيانات', email: 'البريد الإلكتروني', password: 'كلمة المرور', loginButton: 'دخول', loggingIn: 'جاري الدخول…', loginError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', loginUnauthorized: 'هذا البريد الإلكتروني غير مصرح له بالدخول', checkingSession: 'جاري التحقق من الجلسة…' },
  en: { brand: 'Data Viewer', sub: 'View & edit · Supabase', tables: 'Tables', overview: 'Overview', connection: 'Connection', connected: 'Connected', offline: 'Offline', setupTitle: 'Add your anon key to connect', setup: 'This viewer is ready for Supabase. Replace the placeholder in the config block at the top of App.tsx with the public anon key only.', sql: 'Required SQL', table: 'Table', rows: 'Rows', columns: 'Columns', showing: 'Showing', of: 'of', search: 'Search current page…', previous: 'Previous', next: 'Next', noTables: 'No tables available', noTablesCopy: 'The list will update automatically when tables appear.', noRows: 'No data found', noRowsCopy: 'This table has no rows on the current page.', loading: 'Loading data…', error: 'Could not load data', permission: 'Check read permissions and the table RLS policy.', live: 'Live', offlineLive: 'Offline', refresh: 'Refresh', light: 'Light mode', dark: 'Dark mode', language: 'العربية', copySql: 'SQL for Supabase', discovered: 'New table discovered', null: 'Empty', showMore: 'Show more', showLess: 'Show less', updated: 'Live update', inserted: 'New row', deleted: 'Row deleted', addRow: 'Add Row', save: 'Save', cancel: 'Cancel', saving: 'Saving…', insertError: 'Failed to insert row', editRow: 'Edit Row', updateError: 'Failed to update row', noId: 'Cannot edit or delete a row without an id', deleteRow: 'Delete row', confirmDelete: 'Delete this row?', deleteError: 'Failed to delete row', addColumn: 'Add column', columnName: 'New column name', columnType: 'Column type: text, integer, bigint, numeric, boolean, jsonb, date, timestamptz, uuid', columnAdded: 'Column added', addColumnError: 'Failed to add column', logout: 'Sign out', loginTitle: 'Sign in', loginSub: 'Enter your credentials to access the data viewer', email: 'Email address', password: 'Password', loginButton: 'Sign in', loggingIn: 'Signing in…', loginError: 'Incorrect email or password', loginUnauthorized: 'This email is not authorised to access the viewer', checkingSession: 'Checking session…' }
} as const;

/* ========================= LOGIN PAGE ========================= */
function LoginPage({ locale, theme, setTheme, setLocale, onLogin }: { locale: Locale; theme: 'dark' | 'light'; setTheme: (v: 'dark' | 'light') => void; setLocale: (v: Locale) => void; onLogin: (session: Session) => void }) {
  const t = copy[locale];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Enforce allowed email client-side for a fast UX response
    if (email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      setError(t.loginUnauthorized);
      return;
    }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (authError || !data.session) {
      setError(t.loginError);
      return;
    }

    onLogin(data.session);
  };

  return (
    <div className="login-shell" data-theme={theme}>
      {/* Theme + language controls */}
      <div className="login-controls">
        <button className="control-button" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>{t.language}</button>
        <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t.light : t.dark}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon"><Database size={28} /></div>
          <div className="login-logo-text">
            <span lang="ar">شبّاك</span>
            <span className="brand-slash"> / </span>
            <span>Shobbak</span>
          </div>
          <div className="login-logo-sub">{t.sub}</div>
        </div>

        {/* Heading */}
        <h1 className="login-title">{t.loginTitle}</h1>
        <p className="login-sub">{t.loginSub}</p>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">{t.email}</label>
            <input
              id="login-email"
              className={`login-input ${error ? 'login-input-error' : ''}`}
              type="email"
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">{t.password}</label>
            <input
              id="login-password"
              className={`login-input ${error ? 'login-input-error' : ''}`}
              type="password"
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? (
              <><RefreshCw size={16} className="spin" />{t.loggingIn}</>
            ) : (
              t.loginButton
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ========================= EXISTING COMPONENTS (UNCHANGED) ========================= */

function formatValue(value: unknown, column: ViewerColumn, locale: Locale, expanded: boolean, onToggle: () => void) {
  const t = copy[locale];
  if (value === null || value === undefined) return <span className="cell-null">—</span>;
  if (typeof value === 'boolean') return <span className={`cell-bool ${value ? '' : 'false'}`} title={value ? 'true' : 'false'}>{value ? <Check size={14} /> : <X size={14} />}</span>;
  if (column.data_type.includes('timestamp') || column.data_type === 'date' || column.data_type === 'time') {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return <span title={String(value)}>{date.toLocaleString(locale === 'ar' ? 'ar' : 'en')}</span>;
  }
  if (column.data_type.includes('json')) return <details className="json-block"><summary><Braces size={13} style={{ verticalAlign: 'middle' }} /> JSON</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (text.length > 100) return <span className="cell-long">{expanded ? text : `${text.slice(0, 100)}…`} <button className="show-more" onClick={onToggle}>{expanded ? t.showLess : t.showMore}</button></span>;
  return <span title={text}>{text}</span>;
}

function Sidebar({ tables, selected, onSelect, locale, open, onClose }: { tables: ViewerTable[]; selected: string; onSelect: (name: string) => void; locale: Locale; open: boolean; onClose: () => void }) {
  const t = copy[locale];
  return <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={t.tables}>
    <div className="brand"><div className="brand-mark"><Database size={17} /></div><div><div className="brand-name"><span lang="ar">شبّاك</span><span className="brand-slash">/</span><span>Shobbak</span></div><div className="brand-sub">{t.sub}</div></div><button className="icon-button mobile-menu" onClick={onClose} aria-label={t.close}><X size={17} /></button></div>
    <div className="nav-label">{t.tables.toUpperCase()}</div>
    <div className="table-list">{tables.length ? tables.map((item) => <button key={item.table_name} className={`table-item ${selected === item.table_name ? 'active' : ''}`} onClick={() => { onSelect(item.table_name); onClose(); }}><span className="table-name"><Table2 size={16} /><span>{item.table_name}</span></span><span className="table-count">{item.rowCount ?? '—'}</span></button>) : <div className="sidebar-footer">{t.noTables}</div>}</div>
    <div className="sidebar-footer">{t.overview}<br />{tables.length} {t.tables.toLowerCase()}</div>
  </aside>;
}

function Topbar({ table, locale, setLocale, live, theme, setTheme, onMenu, onSearch, search, onSql, onLogout, userEmail }: { table?: ViewerTable; locale: Locale; setLocale: (v: Locale) => void; live: 'online' | 'offline' | 'error'; theme: 'dark' | 'light'; setTheme: (v: 'dark' | 'light') => void; onMenu: () => void; onSearch: (v: string) => void; search: string; onSql: () => void; onLogout: () => void; userEmail: string }) {
  const t = copy[locale];
  return <header className="topbar">
    <div className="title-wrap">
      <div className="eyebrow">{t.table}</div>
      <h1 className="page-title">{table && <Table2 size={16} aria-hidden="true" />}{table?.table_name ?? t.overview}</h1>
    </div>
    <div className="toolbar">
      <button className="icon-button mobile-menu" onClick={onMenu} aria-label={t.tables}><Menu size={18} /></button>
      <label className="search-box"><Search size={16} /><span className="sr-only">{t.search}</span><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t.search} /></label>
      <span className={`live-badge ${live}`}><span className="live-dot" />{live === 'online' ? t.live : live === 'error' ? t.offlineLive : t.offline}</span>
      <button className="control-button" onClick={onSql}><FileCode2 size={15} />{t.sql}</button>
      <button className="control-button" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>{t.language}</button>
      <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t.light : t.dark}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
      {/* ── Logout button ── */}
      <button
        className="control-button logout-button"
        onClick={onLogout}
        title={`${t.logout} (${userEmail})`}
        aria-label={t.logout}
      >
        <LogOut size={15} />
        <span className="logout-label">{t.logout}</span>
      </button>
    </div>
  </header>;
}

function DataGrid({ table, rows, loading, error, locale, search, sort, setSort, page, totalPages, onPage, expanded, setExpanded, newRowActive, newRowData, savingNew, onNewRowData, onSaveNew, onCancelNew, editingRowId, editData, savingEdit, onStartEdit, onSaveEdit, onCancelEdit, onEditData, onDelete, onAddColumn }: { table?: ViewerTable; rows: Record<string, unknown>[]; loading: boolean; error: string | null; locale: Locale; search: string; sort: SortState; setSort: (column: string) => void; page: number; totalPages: number; onPage: (page: number) => void; expanded: string | null; setExpanded: (value: string | null) => void; newRowActive: boolean; newRowData: Record<string, string>; savingNew: boolean; onNewRowData: (column: string, value: string) => void; onSaveNew: () => void; onCancelNew: () => void; editingRowId: string | null; editData: Record<string, string>; savingEdit: boolean; onStartEdit: (row: Record<string, unknown>, rowId: string) => void; onSaveEdit: () => void; onCancelEdit: () => void; onEditData: (column: string, value: string) => void; onDelete: (rowId: string) => void; onAddColumn: () => void }) {
const t = copy[locale];
      const metadataColumns = table?.columns ?? [];
      const columns = metadataColumns.length ? metadataColumns : Object.keys(rows[0] ?? {}).map((name, index) => ({ name, data_type: typeof rows[0]?.[name], position: index + 1 }));
    const filterOut = new Set(['id', 'created_at', 'updated_at']);
    const editColumns = columns.filter((c) => !filterOut.has(c.name));
    const filteredRows = useMemo(() => rows.filter((row) => !search || Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(search.toLowerCase()))), [rows, search]);
  const sortedRows = useMemo(() => sort ? [...filteredRows].sort((a, b) => { const av = a[sort.column]; const bv = b[sort.column]; return String(av ?? '').localeCompare(String(bv ?? ''), locale === 'ar' ? 'ar' : 'en', { numeric: true }) * (sort.direction === 'asc' ? 1 : -1); }) : filteredRows, [filteredRows, sort, locale]);
  const pagedRows = sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  if (loading) return <div className="skeleton-table">{[1, 2, 3, 4, 5].map((item) => <div className="skeleton" key={item} style={{ width: `${68 + item * 5}%` }} />)}</div>;
  if (error) return <div className="error-state"><div><div className="state-icon"><AlertCircle size={21} /></div><div className="state-title">{t.error}</div><p className="state-copy">{error} {t.permission}</p></div></div>;
  if (!table) return <div className="empty-state"><div><div className="state-icon"><Table2 size={21} /></div><div className="state-title">{t.noTables}</div><p className="state-copy">{t.noTablesCopy}</p></div></div>;
    if (!sortedRows.length && !columns.length) return <div className="empty-state"><div><div className="state-icon"><CircleHelp size={21} /></div><div className="state-title">{t.noRows}</div><p className="state-copy">{t.noRowsCopy}</p></div></div>;
  return <><div className="table-scroll"><table><thead><tr>{columns.map((column) => <th key={column.name}><span className="th-label">{column.name}</span></th>)}<th className="th-actions"><button className="row-btn" onClick={onAddColumn} title={t.addColumn}><Plus size={14} /></button></th></tr></thead><tbody>{pagedRows.map((row, rowIndex) => { const rowKey = String(row.id ?? `idx-${rowIndex}`); const isEditing = editingRowId === rowKey; return <tr key={`${rowKey}-${rowIndex}`} className={`${rowIndex === 0 && rows.length && rowIndex === 0 ? 'realtime-row' : ''} ${isEditing ? 'editing-row' : ''} ${savingEdit && isEditing ? 'saving-row' : ''}`}>{columns.map((column) => { const skip = filterOut.has(column.name); if (isEditing) return <td key={column.name}>{skip ? <span className="cell-null">—</span> : <input className="cell-input" value={editData[column.name] ?? ''} onChange={(e) => onEditData(column.name, e.target.value)} placeholder={`${column.name}...`} disabled={savingEdit} />}</td>; return <td key={column.name} onDoubleClick={() => onStartEdit(row, rowKey)}><span className="editable-cell">{formatValue(row[column.name], column, locale, expanded === `${rowKey}-${column.name}`, () => setExpanded(expanded === `${rowKey}-${column.name}` ? null : `${rowKey}-${column.name}`))}</span></td>; })}{isEditing ? <td className="td-actions"><div className="row-actions"><button className="row-btn save" onClick={onSaveEdit} disabled={savingEdit} title={t.save}>{savingEdit ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}</button><button className="row-btn cancel" onClick={onCancelEdit} disabled={savingEdit} title={t.cancel}><X size={14} /></button></div></td> : <td className="td-actions"><div className="row-actions"><button className="row-btn edit-pen" onClick={() => onStartEdit(row, rowKey)} title={t.editRow}><span className="pen-icon">✎</span></button><button className="row-btn cancel" onClick={() => onDelete(rowKey)} title={t.deleteRow}><Trash2 size={14} /></button></div></td>}</tr>; })}{newRowActive && <tr className={`new-row-active ${savingNew ? 'saving-row' : ''}`}>{columns.map((column) => { const skip = filterOut.has(column.name); return <td key={column.name}>{skip ? <span className="cell-null">—</span> : <input className="cell-input" value={newRowData[column.name] ?? ''} onChange={(e) => onNewRowData(column.name, e.target.value)} placeholder={`${column.name}...`} disabled={savingNew} />}</td>; })}<td className="td-actions"><div className="row-actions"><button className="row-btn save" onClick={onSaveNew} disabled={savingNew} title={t.save}>{savingNew ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}</button><button className="row-btn cancel" onClick={onCancelNew} disabled={savingNew} title={t.cancel}><X size={14} /></button></div></td></tr>}</tbody></table></div><div className="table-bottom-bar"><div className="pagination"><span>{t.showing} {pagedRows.length} {t.of} {sortedRows.length}</span><div className="pagination-controls"><button className="control-button" disabled={page <= 0} onClick={() => onPage(page - 1)}><ChevronLeft size={15} />{t.previous}</button><button className="control-button" disabled={page >= Math.ceil(sortedRows.length / PAGE_SIZE) - 1} onClick={() => onPage(page + 1)}>{t.next}<ChevronRight size={15} /></button></div></div><button className="primary-button" onClick={newRowActive ? onCancelNew : onSaveNew}><Plus size={15} />{newRowActive ? t.cancel : t.addRow}</button></div></>;
}

function SqlPanel({ locale, onClose }: { locale: Locale; onClose: () => void }) {
    const t = copy[locale];
    const sql = `-- Updated handle_table_operations — authenticated role only.
-- Run once in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION handle_table_operations(
  operation TEXT,
  table_name TEXT,
  row_data JSONB DEFAULT NULL,
  row_id BIGINT DEFAULT NULL,
  column_name TEXT DEFAULT NULL,
  column_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Empty = every public table. Or list names: ARRAY['orders','customers']
  allowed_tables TEXT[] := ARRAY[]::TEXT[];
  allowed_types TEXT[] := ARRAY['text','integer','bigint','numeric','boolean','jsonb','date','timestamptz','uuid'];
  clean JSONB;
  cols TEXT;
  result JSONB;
BEGIN
  -- Only allow authenticated users
  IF auth.role() != 'authenticated' THEN
    RAISE EXCEPTION 'Access denied: authenticated role required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND t.table_name = handle_table_operations.table_name
  ) THEN
    RAISE EXCEPTION 'Unknown table: %', table_name;
  END IF;
  IF cardinality(allowed_tables) > 0 AND NOT (table_name = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Table not allowed: %', table_name;
  END IF;

  clean := COALESCE(row_data, '{}'::jsonb) - 'id' - 'created_at' - 'updated_at';
  SELECT string_agg(quote_ident(k), ', ') INTO cols FROM jsonb_object_keys(clean) AS k;

  CASE operation
    WHEN 'SELECT' THEN
      EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t', table_name)
      INTO result;

    WHEN 'INSERT' THEN
      IF cols IS NULL THEN
        EXECUTE format('INSERT INTO public.%1$I DEFAULT VALUES RETURNING to_jsonb(%1$I.*)', table_name)
        INTO result;
      ELSE
        EXECUTE format(
          'INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1) RETURNING to_jsonb(%1$I.*)',
          table_name, cols
        ) INTO result USING clean;
      END IF;

    WHEN 'UPDATE' THEN
      IF row_id IS NULL OR cols IS NULL THEN
        RAISE EXCEPTION 'UPDATE needs row_id and at least one column';
      END IF;
      EXECUTE format(
        'UPDATE public.%1$I AS t SET (%2$s) = (SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1)) WHERE t.id = $2 RETURNING to_jsonb(t.*)',
        table_name, cols
      ) INTO result USING clean, row_id;

    WHEN 'DELETE' THEN
      IF row_id IS NULL THEN RAISE EXCEPTION 'DELETE needs row_id'; END IF;
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', table_name) USING row_id;
      result := jsonb_build_object('success', true);

    WHEN 'ADD_COLUMN' THEN
      IF column_name IS NULL OR column_type IS NULL OR NOT (lower(column_type) = ANY(allowed_types)) THEN
        RAISE EXCEPTION 'ADD_COLUMN needs column_name and a type from: %', allowed_types;
      END IF;
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s', table_name, column_name, lower(column_type));
      result := jsonb_build_object('success', true);

    ELSE
      RAISE EXCEPTION 'Unknown operation: %', operation;
  END CASE;

  RETURN result;
END;
$$;

-- Grant only to authenticated; revoke from anon
REVOKE ALL ON FUNCTION handle_table_operations(TEXT, TEXT, JSONB, BIGINT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION handle_table_operations(TEXT, TEXT, JSONB, BIGINT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION handle_table_operations(TEXT, TEXT, JSONB, BIGINT, TEXT, TEXT) TO authenticated;`;
  return <div className="sql-panel" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="sql-drawer" aria-label={t.sql}><div className="sql-head"><div><h2>{t.sql}</h2><p>{locale === 'ar' ? 'شغّل هذا السكربت في محرر SQL داخل Supabase ليحل محل الدالة القديمة.' : 'Run this script in the Supabase SQL Editor to replace the old function.'}</p></div><button className="icon-button" onClick={onClose} aria-label={t.close}><X size={18} /></button></div><pre className="sql-code">{sql}</pre></section></div>;
}

/* ========================= MAIN APP ========================= */

export default function App() {
  const [locale, setLocale] = useState<Locale>('ar');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // ── Auth state ──
  const [session, setSession] = useState<Session | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // ── Data viewer state (unchanged) ──
  const [tables, setTables] = useState<ViewerTable[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSortState] = useState<SortState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<'online' | 'offline' | 'error'>('offline');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newRowActive, setNewRowActive] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [savingNew, setSavingNew] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const toastId = useRef(0);
  const selected = tables.find((item) => item.table_name === selectedName);
  const t = copy[locale];

  /* ── Check existing session on mount ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthChecking(false);
    });

    // Listen for auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Apply theme + locale to document ── */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = locale;
  }, [theme, locale]);

  /* ── Logout handler ── */
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    // Reset viewer state on logout
    setTables([]);
    setSelectedName('');
    setRows([]);
    setError(null);
  }, []);

  /* ── Toast helper ── */
  const notify = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);

  /* ── Table discovery (only runs when authenticated) ── */
  const discover = useCallback(async (initial = false) => {
    const { data, error: rpcError } = await supabase.rpc('list_viewer_tables');
    if (rpcError) { if (initial) setError(rpcError.message); return; }
    const discovered = ((data ?? []) as ViewerTable[]).map((item) => {
      const rawColumns = typeof item.columns === 'string' ? JSON.parse(item.columns) : item.columns;
      return { ...item, columns: Array.isArray(rawColumns) ? rawColumns : [] };
    });
    setTables((current) => {
      const existing = new Set(current.map((item) => item.table_name));
      const added = discovered.filter((item) => !existing.has(item.table_name));
      if (added.length) notify(`${t.discovered}: ${added.map((item) => item.table_name).join(', ')}`);
      return discovered;
    });
    setSelectedName((current) => current || discovered[0]?.table_name || '');
  }, [notify, t.discovered]);

  useEffect(() => {
    if (!session) return;
    discover(true);
    const timer = window.setInterval(() => discover(), DISCOVERY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [discover, session]);

  useEffect(() => { setPage(0); setRows([]); setError(null); setSearch(''); setSortState(null); setExpanded(null); }, [selectedName]);

  /* ── Row loading + realtime subscription ── */
  useEffect(() => {
    if (!selectedName || !session) { setLive('offline'); return; }
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase.rpc('handle_table_operations', { operation: 'SELECT', table_name: selectedName });
      if (!active) return;
      if (queryError) { setError(queryError.message); setLoading(false); return; }
      const loadedRows = byId((data ?? []) as Record<string, unknown>[]);
      setRows(loadedRows);
      if (loadedRows[0]) setTables((current) => current.map((item) => item.table_name === selectedName && item.columns.length === 0 ? { ...item, columns: Object.keys(loadedRows[0]).map((name, index) => ({ name, data_type: typeof loadedRows[0][name], position: index + 1 })) } : item));
      setError(null);
      setLoading(false);
    };
    load();
    const channel = supabase.channel(`viewer:${selectedName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: selectedName }, (payload) => {
        const next = payload.new as Record<string, unknown>;
        const old = payload.old as Record<string, unknown>;
        const key = String(next.id ?? old.id ?? '');
        setRows((current) => {
          if (payload.eventType === 'INSERT') return byId([...current.filter((row) => String(row.id) !== key), next]);
          if (payload.eventType === 'DELETE') return current.filter((row) => String(row.id) !== key);
          return byId(current.map((row) => String(row.id) === key ? next : row));
        });
        notify(payload.eventType === 'INSERT' ? t.inserted : payload.eventType === 'DELETE' ? t.deleted : t.updated);
      });
    channel.subscribe((status) => setLive(status === 'SUBSCRIBED' ? 'online' : 'error'));
    return () => { active = false; supabase.removeChannel(channel); setLive('offline'); };
  }, [selectedName, session, notify, t]);

  useEffect(() => { setPage(0); }, [search]);

  const setSort = (column: string) => setSortState((current) => current?.column === column ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { column, direction: 'asc' });

  const reloadRows = useCallback(async () => {
    if (!selectedName) return;
    const { data, error: e } = await supabase.rpc('handle_table_operations', { operation: 'SELECT', table_name: selectedName });
    if (!e && data) setRows(byId(data as Record<string, unknown>[]));
  }, [selectedName]);

  const handleDelete = useCallback(async (rowId: string) => {
    if (!selectedName) return;
    if (rowId.startsWith('idx-')) { notify(t.noId); return; }
    if (!window.confirm(t.confirmDelete)) return;
    const { error: delError } = await supabase.rpc('handle_table_operations', { operation: 'DELETE', table_name: selectedName, row_id: Number(rowId) });
    if (delError) { notify(`${t.deleteError}: ${delError.message}`); return; }
    notify(t.deleted);
    await reloadRows();
  }, [selectedName, notify, t, reloadRows]);

  const handleAddColumn = useCallback(async () => {
    if (!selectedName) return;
    const name = window.prompt(t.columnName)?.trim();
    if (!name) return;
    const type = (window.prompt(t.columnType, 'text') ?? '').trim().toLowerCase();
    if (!type) return;
    const { error: colError } = await supabase.rpc('handle_table_operations', { operation: 'ADD_COLUMN', table_name: selectedName, column_name: name, column_type: type });
    if (colError) { notify(`${t.addColumnError}: ${colError.message}`); return; }
    notify(t.columnAdded);
    await discover();
    await reloadRows();
  }, [selectedName, notify, t, discover, reloadRows]);

  const handleNewRow = useCallback(() => { setNewRowActive(true); setNewRowData({}); }, []);

  const handleSaveNew = useCallback(async () => {
    if (!selectedName) return;
    const rowData = cleanRowData(newRowData);
    console.log('operation:', 'INSERT');
    console.log('row_data being sent:', rowData);
    if (!Object.keys(rowData).length) { notify(t.insertError); return; }
    setSavingNew(true);
    const { error: insertError } = await supabase.rpc('handle_table_operations', { operation: 'INSERT', table_name: selectedName, row_data: rowData });
    setSavingNew(false);
    if (insertError) { notify(`${t.insertError}: ${insertError.message}`); return; }
    setNewRowActive(false); setNewRowData({}); notify(t.inserted);
    await reloadRows();
  }, [selectedName, newRowData, notify, t, reloadRows]);

  const handleCancelNew = useCallback(() => { setNewRowActive(false); setNewRowData({}); }, []);

  const handleStartEdit = useCallback((row: Record<string, unknown>, rowId: string) => {
    if (row.id === undefined || row.id === null) { notify(t.noId); return; }
    setEditingRowId(rowId);
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) { init[k] = v === null ? '' : String(v); }
    setEditData(init);
  }, [notify, t]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedName || !editingRowId) return;
    const rowData = cleanRowData(editData);
    console.log('operation:', 'UPDATE');
    console.log('row_id:', editingRowId);
    console.log('row_data being sent:', rowData);
    setSavingEdit(true);
    const { error: updateError } = await supabase.rpc('handle_table_operations', { operation: 'UPDATE', table_name: selectedName, row_id: Number(editingRowId), row_data: rowData });
    setSavingEdit(false);
    if (updateError) { notify(`${t.updateError}: ${updateError.message}`); return; }
    setEditingRowId(null); setEditData({}); notify(t.updated);
    await reloadRows();
  }, [selectedName, editingRowId, editData, notify, t, reloadRows]);

  const handleCancelEdit = useCallback(() => { setEditingRowId(null); setEditData({}); }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  /* ── Render: session check loading state ── */
  if (authChecking) {
    return (
      <div className="auth-checking" data-theme={theme}>
        <RefreshCw size={24} className="spin" />
        <span>{t.checkingSession}</span>
      </div>
    );
  }

  /* ── Render: Login page when not authenticated ── */
  if (!session) {
    return (
      <LoginPage
        locale={locale}
        theme={theme}
        setTheme={setTheme}
        setLocale={setLocale}
        onLogin={setSession}
      />
    );
  }

  /* ── Render: Data viewer (authenticated) ── */
  return (
    <div className="app-shell">
      <Sidebar tables={tables} selected={selectedName} onSelect={setSelectedName} locale={locale} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="workspace">
        <Topbar
          table={selected}
          locale={locale}
          setLocale={setLocale}
          live={live}
          theme={theme}
          setTheme={setTheme}
          onMenu={() => setMenuOpen(true)}
          onSearch={setSearch}
          search={search}
          onSql={() => setDrawerOpen(true)}
          onLogout={handleLogout}
          userEmail={session.user.email ?? ''}
        />
        <section className="content">
          <div className="stats">
            <div className="stat-card"><div className="stat-label">{t.tables}</div><div className="stat-value accent">{tables.length}</div></div>
            <div className="stat-card"><div className="stat-label">{t.columns}</div><div className="stat-value">{selected?.columns.length ?? 0}</div></div>
            <div className="stat-card"><div className="stat-label">{t.connection}</div><div className="stat-value" style={{ fontSize: 16, color: live === 'online' ? 'var(--success)' : 'var(--muted)' }}>{live === 'online' ? t.connected : t.offline}</div></div>
          </div>
          <div className="data-card">
            <div className="data-card-head">
              <div className="data-card-title">{selected?.table_name ?? t.overview}</div>
              <div className="data-card-meta">{selected?.columns.length ?? 0} {t.columns.toLowerCase()}</div>
            </div>
            <DataGrid
              table={selected}
              rows={rows}
              loading={loading}
              error={error}
              locale={locale}
              search={search}
              sort={sort}
              setSort={setSort}
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              expanded={expanded}
              setExpanded={setExpanded}
              newRowActive={newRowActive}
              newRowData={newRowData}
              savingNew={savingNew}
              onNewRowData={(col, val) => setNewRowData((prev) => ({ ...prev, [col]: val }))}
              onSaveNew={newRowActive ? handleSaveNew : handleNewRow}
              onCancelNew={handleCancelNew}
              editingRowId={editingRowId}
              editData={editData}
              savingEdit={savingEdit}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onEditData={(col, val) => setEditData((prev) => ({ ...prev, [col]: val }))}
              onDelete={handleDelete}
              onAddColumn={handleAddColumn}
            />
          </div>
        </section>
      </main>
      {drawerOpen && <SqlPanel locale={locale} onClose={() => setDrawerOpen(false)} />}
      <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className="toast" key={toast.id}><Check size={16} />{toast.message}</div>)}</div>
    </div>
  );
}

/*
 * ── LOGIN PAGE CSS ──
 * Add these rules to your theme.css (styles/theme.css)
 * They use your existing CSS variables so they match the dark-orange theme automatically.
 *
 * === PASTE INTO theme.css ===

.auth-checking {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100dvh;
  color: var(--muted);
  font-size: 15px;
}

.login-shell {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  padding: 24px 16px;
  position: relative;
}

.login-controls {
  position: absolute;
  top: 20px;
  inset-inline-end: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 36px 36px;
  box-shadow: 0 8px 40px rgba(0,0,0,.18);
}

.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 28px;
  text-align: center;
}

.login-logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.login-logo-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.login-logo-sub {
  font-size: 12px;
  color: var(--muted);
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin: 0 0 6px;
}

.login-sub {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  margin: 0 0 28px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.login-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}

.login-input.login-input-error {
  border-color: var(--danger, #e53e3e);
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--danger, #e53e3e) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #e53e3e) 30%, transparent);
  color: var(--danger, #e53e3e);
  font-size: 13px;
}

.login-button {
  width: 100%;
  padding: 11px 18px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s, transform 0.1s;
  margin-top: 4px;
}

.login-button:hover:not(:disabled) { opacity: 0.88; }
.login-button:active:not(:disabled) { transform: scale(0.98); }
.login-button:disabled { opacity: 0.55; cursor: not-allowed; }

.logout-button {
  color: var(--danger, #e53e3e) !important;
  border-color: color-mix(in srgb, var(--danger, #e53e3e) 30%, transparent) !important;
}

.logout-button:hover {
  background: color-mix(in srgb, var(--danger, #e53e3e) 10%, transparent) !important;
}

.logout-label {
  display: none;
}

@media (min-width: 640px) {
  .logout-label { display: inline; }
}

 * === END OF theme.css ADDITIONS ===
 */
