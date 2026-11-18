import { useEffect, useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { calendarIso, calendarWeekday, dateInputError, daysInMonth, displayDateTimeToLocal, displayDateToIso, formatDate, isoDateToDisplay, localDateTimeToDisplay, moveCalendarDay, parseDateOnly, validTime } from '../../utils/dateTime';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max'> & {
  value: string; onChange: (iso: string) => void; min?: string; max?: string; dateTime?: boolean; onDraftChange?: (display: string) => void; resetKey?: number; initialDisplayValue?: string;
};
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AppDatePicker({ value, onChange, min, max, dateTime = false, onDraftChange, resetKey, initialDisplayValue, required, disabled, readOnly, className = '', id, ...props }: Props) {
  const uid = useId(), input = useRef<HTMLInputElement>(null), root = useRef<HTMLSpanElement>(null), popup = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(() => initialDisplayValue ?? (dateTime ? localDateTimeToDisplay(value) : isoDateToDisplay(value)));
  const [touched, setTouched] = useState(false), [open, setOpen] = useState(false), [focused, setFocused] = useState('');
  const [view, setView] = useState(() => { const date = new Date(); return { year: date.getFullYear(), month: date.getMonth() + 1 }; }), [yearDraft, setYearDraft] = useState(''), [timeDraft, setTimeDraft] = useState('00:00');
  const focusRequested = useRef(false);
  const label = props['aria-label'] || 'date', errorId = `${uid}-error`, helpId = `${uid}-help`, captionId = `${uid}-caption`;
  const low = min?.slice(0, 10), high = max?.slice(0, 10);
  const datePart = dateTime ? draft.split(' ')[0] : draft;
  const parsed = dateTime ? displayDateTimeToLocal(draft) : displayDateToIso(draft);
  let error = dateInputError(datePart, { required, min: low, max: high });
  if (dateTime && draft && !parsed) error = 'Enter a valid date and time as dd/mm/yyyy HH:mm (24-hour).';
  if (dateTime && parsed && min && parsed < min) error = `Choose a date and time on or after ${localDateTimeToDisplay(min)}.`;
  if (dateTime && parsed && max && parsed > max) error = `Choose a date and time on or before ${localDateTimeToDisplay(max)}.`;
  const visibleError = touched && error;
  const liveError = useRef(error); liveError.current = error;
  const close = (restore = true) => { setOpen(false); if (restore) input.current?.focus({ preventScroll: true }); };
  const clamp = (iso: string) => low && iso < low ? low : high && iso > high ? high : iso;
  const previousValue = useRef({ value, dateTime, resetKey });
  useEffect(() => {
    const previous = previousValue.current; previousValue.current = { value, dateTime, resetKey };
    if (previous.value === value && previous.dateTime === dateTime && previous.resetKey === resetKey) return;
    setDraft(dateTime ? localDateTimeToDisplay(value) : isoDateToDisplay(value)); setTouched(false);
  }, [value, dateTime, resetKey]);
  useEffect(() => {
    const node = input.current, form = node?.form;
    const guard = (event: Event) => {
      if (!node || node.matches(':disabled') || readOnly || !liveError.current) return;
      event.preventDefault(); event.stopImmediatePropagation(); setTouched(true); node.focus(); node.reportValidity();
    };
    // Also protect forms using noValidate; an incomplete display draft never submits an old ISO value.
    form?.addEventListener('submit', guard, true);
    return () => form?.removeEventListener('submit', guard, true);
  }, [readOnly]);
  useLayoutEffect(() => { input.current?.setCustomValidity(error); }, [error]);
  useEffect(() => { if (open && (disabled || input.current?.matches(':disabled'))) close(false); });
  const openCalendar = () => {
    if (disabled || readOnly || input.current?.matches(':disabled')) return;
    const now = new Date();
    const iso = clamp((dateTime ? displayDateTimeToLocal(draft)?.slice(0, 10) : displayDateToIso(draft)) || value.slice(0, 10) || calendarIso({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }));
    const date = parseDateOnly(iso); if (!date) return;
    focusRequested.current = true; setView({ year: date.year, month: date.month }); setYearDraft(String(date.year)); setFocused(iso);
    setTimeDraft(dateTime ? draft.split(' ')[1] || value.slice(11, 16) || '00:00' : '00:00'); setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open || !popup.current || !input.current) return;
    const panel = popup.current;
    if (typeof panel.showPopover === 'function') panel.showPopover();
    const position = () => {
      const rect = input.current!.getBoundingClientRect(), width = Math.min(320, window.innerWidth - 16), height = panel.getBoundingClientRect().height;
      panel.style.width = `${width}px`; panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
      panel.style.top = `${Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - height - 8))}px`;
    };
    position(); panel.querySelector<HTMLElement>(`button[data-date="${focused}"]`)?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!panel.contains(event.target as Node) && !root.current?.contains(event.target as Node)) close(false); };
    document.addEventListener('pointerdown', outside); window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
    return () => { if (typeof panel.hidePopover === 'function' && panel.matches(':popover-open')) panel.hidePopover(); document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);
  useLayoutEffect(() => { if (open && focusRequested.current) { popup.current?.querySelector<HTMLElement>(`button[data-date="${focused}"]`)?.focus({ preventScroll: true }); focusRequested.current = false; } }, [focused, open]);
  const commit = (display: string) => {
    if (input.current?.matches(':disabled') || readOnly) return;
    setDraft(display); onDraftChange?.(display);
    if (!display) { onChange(''); return; }
    const iso = dateTime ? displayDateTimeToLocal(display) : displayDateToIso(display);
    if (iso && !dateInputError(dateTime ? display.split(' ')[0] : display, { min: low, max: high }) && (!dateTime || ((!min || iso >= min) && (!max || iso <= max)))) onChange(iso);
  };
  const focusDate = (iso: string, requestFocus = true) => { const next = clamp(iso), date = parseDateOnly(next); if (date) { focusRequested.current = requestFocus; setFocused(next); setView({ year: date.year, month: date.month }); setYearDraft(String(date.year)); } };
  const changeMonth = (amount: number, requestFocus = false) => {
    const index = view.year * 12 + view.month - 1 + amount, year = Math.floor(index / 12), month = (index % 12) + 1;
    if (year < 1 || year > 9999) return;
    focusDate(calendarIso({ year, month, day: Math.min(parseDateOnly(focused)?.day || 1, daysInMonth(year, month)) }), requestFocus);
  };
  const choose = (iso: string) => {
    if ((low && iso < low) || (high && iso > high)) return;
    commit(dateTime ? `${isoDateToDisplay(iso)} ${timeDraft}` : isoDateToDisplay(iso));
    setTouched(true); if (!dateTime || validTime(timeDraft)) close();
  };
  const calendarKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') {
      const controls = [...popup.current!.querySelectorAll<HTMLElement>('button:not(:disabled),select,input')].filter(el => el.tabIndex !== -1);
      if (event.shiftKey ? event.target === controls[0] : event.target === controls.at(-1)) { event.preventDefault(); event.stopPropagation(); (event.shiftKey ? controls.at(-1) : controls[0])?.focus(); }
    }
    if (!(event.target as HTMLElement).hasAttribute('data-date')) return;
    const days: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -calendarWeekday(focused), End: 6 - calendarWeekday(focused) };
    if (event.key in days) { event.preventDefault(); event.stopPropagation(); focusDate(moveCalendarDay(focused, days[event.key])); }
    else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); event.stopPropagation(); changeMonth((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1), true); }
  };
  const cells = Array.from({ length: 42 }, (_, index) => index - calendarWeekday(calendarIso({ ...view, day: 1 })) + 1);
  const selectedIso = (dateTime ? parsed?.slice(0, 10) : parsed) || '';
  return <span ref={root} className="app-date-field">
    <span className="app-date-control"><input {...props} id={id || uid} ref={input} data-app-date-kind={dateTime ? 'datetime' : 'date'} type="text" inputMode={dateTime ? 'text' : 'numeric'} placeholder={dateTime ? 'dd/mm/yyyy HH:mm' : 'dd/mm/yyyy'} autoComplete="off" spellCheck={false} required={required} disabled={disabled} readOnly={readOnly} className={`app-date-input ${className}`} value={draft} aria-invalid={Boolean(visibleError || props['aria-invalid'])} aria-describedby={[props['aria-describedby'], helpId, visibleError ? errorId : ''].filter(Boolean).join(' ')} onInvalid={event => { setTouched(true); props.onInvalid?.(event); }} onChange={event => commit(event.target.value)} onBlur={event => { setTouched(true); props.onBlur?.(event); }} onKeyDown={event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); openCalendar(); }
      else if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); }
      props.onKeyDown?.(event);
    }} /><button type="button" className="app-date-trigger" aria-label={`Open calendar for ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${uid}-calendar` : undefined} disabled={disabled || readOnly} onClick={event => { event.preventDefault(); open ? close() : openCalendar(); }}><CalendarDays size={17} aria-hidden="true" /></button></span>
    <span id={helpId} className="sr-only">{dateTime ? 'Format dd/mm/yyyy HH:mm, 24-hour local time.' : 'Format dd/mm/yyyy.'} Use Arrow Down to open the calendar.</span>
    {visibleError && <span role="alert" id={errorId} className="app-date-error">{error}</span>}
    {open && typeof document !== 'undefined' && createPortal(<div ref={popup} id={`${uid}-calendar`} popover="manual" role="dialog" aria-modal="true" aria-label={`Choose ${label}`} className="app-calendar" onKeyDown={calendarKey}>
      <div className="app-calendar-heading"><button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button><div className="app-calendar-month-year"><select aria-label="Calendar month" value={view.month} onChange={e => { setView({ ...view, month: Number(e.target.value) }); setFocused(calendarIso({ ...view, month: Number(e.target.value), day: 1 })); }}>{monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select><input aria-label="Calendar year" inputMode="numeric" value={yearDraft} onChange={e => { setYearDraft(e.target.value); const year = Number(e.target.value); if (/^\d{1,4}$/.test(e.target.value) && year >= 1 && year <= 9999) { setView({ ...view, year }); setFocused(calendarIso({ ...view, year, day: 1 })); } }} onBlur={() => setYearDraft(String(view.year))} /></div><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={17} /></button></div>
      <p id={captionId} className="sr-only" aria-live="polite">{monthNames[view.month - 1]} {view.year}</p>
      <table role="grid" aria-labelledby={captionId}><thead><tr>{weekdays.map((day, index) => <th key={day} scope="col"><abbr title={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index]}>{day}</abbr></th>)}</tr></thead><tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((day, col) => {
        if (day < 1 || day > daysInMonth(view.year, view.month)) return <td key={col} />;
        const iso = calendarIso({ ...view, day }), unavailable = Boolean((low && iso < low) || (high && iso > high));
        return <td key={col} aria-selected={iso === selectedIso}><button type="button" data-date={iso} aria-label={formatDate(iso)} aria-disabled={unavailable} disabled={unavailable} tabIndex={iso === focused ? 0 : -1} className={iso === selectedIso ? 'app-calendar-selected' : ''} onClick={() => choose(iso)}>{day}</button></td>;
      })}</tr>)}</tbody></table>
      {dateTime && <div className="app-calendar-time"><span>Time (24-hour)</span><input aria-label="Calendar time" placeholder="HH:mm" value={timeDraft} onChange={e => { setTimeDraft(e.target.value); commit(`${draft.split(' ')[0]} ${e.target.value}`); }} /></div>}
      {(min || max) && <p className="app-calendar-help">{low ? `From ${formatDate(low)}` : ''}{low && high ? ' · ' : ''}{high ? `Through ${formatDate(high)}` : ''}</p>}
      <div className="app-calendar-footer">{!required && <button type="button" onClick={() => { commit(''); close(); }}>Clear date</button>}<button type="button" onClick={() => close()}>Close calendar</button></div>
      <span className="sr-only">Arrow keys move by day or week. Home/End move within the week. Page Up/Down changes month; hold Shift for year. Escape closes the calendar.</span>
    </div>, input.current?.closest('dialog,[role="dialog"]') || document.body)}
  </span>;
}

export function AppDateTimePicker(props: Omit<Props, 'dateTime'>) { return <AppDatePicker {...props} dateTime />; }
