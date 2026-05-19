import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease',
    opacity: disabled || loading ? 0.6 : 1,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--primary)',
      color: '#fff',
    },
    secondary: {
      background: 'var(--background-subtle)',
      color: 'var(--foreground)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--foreground-muted)',
    },
    danger: {
      background: 'var(--danger)',
      color: '#fff',
    },
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '8px 16px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' },
  };

  return (
    <button
      style={{ ...baseStyles, ...variants[variant], ...sizes[size] }}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  style,
  ...props
}) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--background-subtle)',
    border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    color: 'var(--foreground)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 150ms ease',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', color: 'var(--foreground-muted)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--foreground-subtle)',
            }}
          >
            {icon}
          </span>
        )}
        <input
          style={icon ? { ...inputStyle, paddingLeft: '36px' } : inputStyle}
          className={className}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style,
  onClick,
  hoverable = false,
}) => {
  const cardStyle: React.CSSProperties = {
    background: 'var(--background-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    cursor: onClick ? 'pointer' : 'default',
    transition: hoverable ? 'all 150ms ease' : 'none',
    ...style,
  };

  return (
    <div
      style={cardStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variants: Record<string, React.CSSProperties> = {
    default: {
      background: 'var(--background-subtle)',
      color: 'var(--foreground-muted)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.1)',
      color: 'var(--success)',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.1)',
      color: 'var(--warning)',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: 'var(--danger)',
    },
    info: {
      background: 'rgba(59, 130, 246, 0.1)',
      color: 'var(--info)',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        ...variants[variant],
      }}
      className={className}
    >
      {children}
    </span>
  );
};

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
}) => {
  const sizes = { sm: 24, md: 32, lg: 48 };
  const fontSizes = { sm: 10, md: 12, lg: 16 };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      style={{
        width: sizes[size],
        height: sizes[size],
        borderRadius: '50%',
        background: src ? `url(${src}) center/cover` : 'var(--accent-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: fontSizes[size],
        fontWeight: 600,
      }}
    >
      {!src && initials}
    </div>
  );
};

interface SpinnerProps {
  size?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20 }) => (
  <div
    style={{
      width: size,
      height: size,
      border: '2px solid var(--border)',
      borderTopColor: 'var(--primary)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }}
  />
);

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 'var(--radius-md)',
}) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      background: 'var(--background-subtle)',
      animation: 'pulse 2s ease-in-out infinite',
    }}
  />
);

export const Text: React.FC<{
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  weight?: number;
  color?: string;
  className?: string;
}> = ({ children, size = 'md', weight = 400, color, className = '' }) => {
  const sizes: Record<string, number> = {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
  };

  return (
    <span
      style={{
        fontSize: sizes[size],
        fontWeight: weight,
        color: color || 'var(--foreground)',
      }}
      className={className}
    >
      {children}
    </span>
  );
};

export const Heading: React.FC<{
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}> = ({ children, level = 1, className = '' }) => {
  const styles: Record<number, React.CSSProperties> = {
    1: { fontSize: '32px', fontWeight: 700 },
    2: { fontSize: '24px', fontWeight: 600 },
    3: { fontSize: '20px', fontWeight: 600 },
    4: { fontSize: '16px', fontWeight: 600 },
  };

  return (
    <h1 style={styles[level]} className={className}>
      {children}
    </h1>
  );
};