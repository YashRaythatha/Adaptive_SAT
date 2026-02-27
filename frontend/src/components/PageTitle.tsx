interface PageTitleProps {
  children: React.ReactNode
  className?: string
}

export default function PageTitle({ children, className = '' }: PageTitleProps) {
  return (
    <h1 className={`text-2xl font-bold text-gray-900 ${className}`.trim()}>
      {children}
    </h1>
  )
}
