export default function InnerGrid({ title, content, content2 }) {
  return (
    <div className="flex flex-row items-center justify-between w-full border-b-2 border-dotted px-6">
      <p className="font-semibold text-lg">{title}</p>
      <p className="font text-lg">
        {content}
        {content2 && ` / ${content2}`}
      </p>
    </div>
  );
}
