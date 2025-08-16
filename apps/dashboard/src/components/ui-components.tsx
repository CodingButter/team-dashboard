// Temporary UI components until @ui package is properly set up
// These are minimal implementations for the monitoring dashboard

export const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
)

export const CardHeader = ({ children, className = '' }: any) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
)

export const CardTitle = ({ children, className = '' }: any) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
)

export const CardDescription = ({ children, className = '' }: any) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>{children}</p>
)

export const CardContent = ({ children, className = '' }: any) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

export const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', ...props }: any) => {
  const variants: any = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  }
  const sizes: any = {
    default: 'px-4 py-2',
    sm: 'px-3 py-1 text-sm',
    lg: 'px-6 py-3 text-lg'
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-md font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export const Alert = ({ children, className = '', variant = 'default' }: any) => (
  <div className={`p-4 rounded-lg border ${className} ${
    variant === 'destructive' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : 
    'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
  }`}>
    {children}
  </div>
)

export const AlertDescription = ({ children, className = '' }: any) => (
  <div className={`text-sm ${className}`}>{children}</div>
)

export const AlertTitle = ({ children, className = '' }: any) => (
  <div className={`font-semibold mb-1 ${className}`}>{children}</div>
)

export const Badge = ({ children, variant = 'default', className = '' }: any) => {
  const variants: any = {
    default: 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
    secondary: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
    destructive: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
    outline: 'border border-gray-300 dark:border-gray-600'
  }
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export const ScrollArea = ({ children, className = '' }: any) => (
  <div className={`overflow-auto ${className}`}>{children}</div>
)

export const Progress = ({ value, className = '' }: any) => (
  <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ${className}`}>
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)