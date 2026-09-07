export function Readout({ value, unit, panel, className }: {
  value: string; unit: string; panel?: boolean; className?: string;
}) {
  return (
    <div className={'readout' + (panel ? ' readout--panel' : '') + (className ? ' ' + className : '')}>
      <span className="readout__v">{value}</span>
      <span className="readout__u">{unit}</span>
    </div>
  );
}
