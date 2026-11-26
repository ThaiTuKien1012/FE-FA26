import { formatCount } from './f11.model';
import type { BundleAdditions } from './f11.types';

// A data table keeps all days, origin labels and zeros readable without color or hover.
export function BundleActivity({ data }: { data: BundleAdditions }) {
  const maximum = Math.max(1, ...data.days.flatMap(day => [day.addActionsByOrigin.MINED, day.addActionsByOrigin.MANUAL]));
  const points = (origin: 'MINED' | 'MANUAL') => data.days.map((day, index) => `${50 + index * 700 / Math.max(1, data.days.length - 1)},${170 - 140 * day.addActionsByOrigin[origin] / maximum}`).join(' ');
  return <>
    <p className="f07-muted">{data.from} – {data.to} · {data.timeZone}</p>
    <dl className="f11-totals">
      <div><dt>Bundle add actions</dt><dd>{formatCount(data.totalAddActions)}</dd></div>
      <div><dt>MINED actions</dt><dd>{formatCount(data.addActionsByOrigin.MINED)}</dd></div>
      <div><dt>MANUAL actions</dt><dd>{formatCount(data.addActionsByOrigin.MANUAL)}</dd></div>
      <div><dt>Product units actually added</dt><dd>{formatCount(data.totalAddedProductUnits)}</dd></div>
    </dl>
    {data.totalAddActions === 0 && <p role="status">No bundle additions in this period.</p>}
    <div className="f11-legend"><span>MINED — solid line</span><span>MANUAL ··· dashed line</span></div>
    <svg className="f11-chart" viewBox="0 0 800 210" role="img" aria-label="Daily bundle action trend. Exact counts by origin and units are in the table below.">
      <title>Bundle additions by origin</title>
      <path d="M50 25V170H750" fill="none" stroke="#75827a" />
      <text x="42" y="34" textAnchor="end" fontSize="12">{formatCount(maximum)}</text><text x="42" y="174" textAnchor="end" fontSize="12">0</text>
      <polyline points={points('MINED')} fill="none" stroke="#315b48" strokeWidth="3" />
      <polyline points={points('MANUAL')} fill="none" stroke="#925024" strokeWidth="3" strokeDasharray="7 5" />
      <text x="50" y="198" fontSize="12">{data.from}</text><text x="750" y="198" textAnchor="end" fontSize="12">{data.to}</text>
    </svg>
    <div className="f11-table-scroll" tabIndex={0} role="region" aria-label="Daily bundle additions">
      <table className="f11-table"><caption>Successful BUNDLE_ADDED events by Store-local day</caption><thead><tr><th scope="col">Day</th><th scope="col">MINED actions</th><th scope="col">MANUAL actions</th><th scope="col">Units added</th></tr></thead>
        <tbody>{data.days.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{formatCount(day.addActionsByOrigin.MINED)}</td><td>{formatCount(day.addActionsByOrigin.MANUAL)}</td><td>{formatCount(day.addedProductUnits)}</td></tr>)}</tbody>
      </table>
    </div>
  </>;
}
