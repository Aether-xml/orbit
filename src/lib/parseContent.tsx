import { Link } from 'react-router-dom'

export function parseContent(text: string): React.ReactNode[] {
  const parts = text.split(/(#[\wÀ-ɏ]+|@[\w]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <Link
          key={i}
          to={`/etiket/${part.slice(1).toLowerCase()}`}
          className="text-accent hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }
    if (part.startsWith('@')) {
      return (
        <Link
          key={i}
          to={`/${part.slice(1)}`}
          className="text-accent hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }
    return part
  })
}
