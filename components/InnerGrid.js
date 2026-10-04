import Icon from "./Icon";

export default function InnerGrid({ title, content, content2, icon, unit, note }) {
  return (
    <div className="metric-card">
      <div className="metric-heading"><Icon name={icon} /><span>{title}</span></div>
      <p className="metric-value">{content ?? "—"}{content2 != null && ` / ${content2}`} <span>{unit}</span></p>
      {note && <p className="metric-note">{note}</p>}
    </div>
  );
}
